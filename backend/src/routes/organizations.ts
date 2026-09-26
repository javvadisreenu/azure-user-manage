import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import * as orgRepo from "../repositories/organizationRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import * as userRepo from "../repositories/userRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";
import * as invitationRepo from "../repositories/invitationRepository.js";
import { requireRole } from "../middleware/tenantContext.js";
import { ASSIGNABLE_ROLES } from "../types.js";
import type { Request, Response } from "express";

const router = Router();

function assertOrgAccess(req: Request, res: Response): boolean {
  const tenant = req.tenant!;
  if (tenant.organizationId !== req.params.orgId && !tenant.roles.includes("PlatformAdmin")) {
    res.status(403).json({ error: "insufficient_role" });
    return false;
  }
  return true;
}

// GET /api/organizations — PlatformAdmin only
router.get("/", requireRole("PlatformAdmin"), (req, res) => {
  res.json(orgRepo.list());
});

// POST /api/organizations — PlatformAdmin only
router.post("/", requireRole("PlatformAdmin"), (req, res) => {
  const { name, code } = (req.body ?? {}) as { name?: string; code?: string };
  if (!name || !code) {
    res.status(400).json({ error: "name and code are required" });
    return;
  }

  if (orgRepo.findByCode(code)) {
    res.status(409).json({ error: "code_taken" });
    return;
  }

  const organizationId = uuidv4();
  orgRepo.create({ organizationId, code, name, status: "Active" });

  const membershipId = uuidv4();
  membershipRepo.create({
    membershipId,
    organizationId,
    userId: req.tenant!.userId,
    status: "Active",
  });
  membershipRepo.assignRole(uuidv4(), membershipId, "TenantAdmin");

  auditRepo.log({
    organizationId,
    actorUserId: req.tenant!.userId,
    eventType: "OrganizationCreated",
    resourceType: "Organization",
    resourceId: organizationId,
    details: { name, code },
  });

  res.status(201).json({ organizationId, membershipId });
});

// GET /api/organizations/:orgId
router.get("/:orgId", (req, res) => {
  if (!assertOrgAccess(req, res)) return;
  const org = orgRepo.findById(req.params.orgId);
  if (!org) {
    res.status(404).json({ error: "not_found" });
    return;
  }
  res.json(org);
});

// GET /api/organizations/:orgId/stats — dashboard summary
router.get("/:orgId/stats", (req, res) => {
  if (!assertOrgAccess(req, res)) return;
  const orgId = req.params.orgId;
  res.json({
    memberCount: membershipRepo.countActiveByOrganization(orgId),
    pendingInviteCount: invitationRepo.countPendingByOrganization(orgId),
    recentEventCount: auditRepo.countRecentByOrganization(orgId),
  });
});

// PATCH /api/organizations/:orgId
router.patch("/:orgId", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { name, status } = (req.body ?? {}) as { name?: string; status?: string };
  if (name === undefined && status === undefined) {
    res.status(400).json({ error: "nothing_to_update" });
    return;
  }
  if (status !== undefined && !["Active", "Suspended", "Archived"].includes(status)) {
    res.status(400).json({ error: "invalid_status" });
    return;
  }

  if (name !== undefined) orgRepo.updateName(req.params.orgId, name);
  if (status !== undefined) orgRepo.updateStatus(req.params.orgId, status);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant!.userId,
    eventType: "OrganizationUpdated",
    resourceType: "Organization",
    resourceId: req.params.orgId,
    details: { name, status },
  });

  res.json({ ok: true });
});

// GET /api/organizations/:orgId/members — paginated, searchable
router.get("/:orgId/members", requireRole("TenantAdmin", "Manager"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10) || 25));
  const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
  const { rows, total } = membershipRepo.listByOrganization(req.params.orgId, { page, limit, search });
  res.json({ members: rows, total, page, limit });
});

// POST /api/organizations/:orgId/members
router.post("/:orgId/members", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { userId, roleCode } = (req.body ?? {}) as { userId?: string; roleCode?: string };
  if (!userId) {
    res.status(400).json({ error: "userId_required" });
    return;
  }

  const role = roleCode || "User";
  if (!ASSIGNABLE_ROLES.includes(role)) {
    res.status(400).json({ error: "invalid_role" });
    return;
  }

  const user = userRepo.findById(userId);
  if (!user) {
    res.status(404).json({ error: "user_not_found" });
    return;
  }

  const existing = membershipRepo.findByOrganizationAndUser(req.params.orgId, userId);
  if (existing) {
    res.status(409).json({ error: "already_member" });
    return;
  }

  const membershipId = uuidv4();
  membershipRepo.create({
    membershipId,
    organizationId: req.params.orgId,
    userId,
    status: "Active",
  });
  membershipRepo.assignRole(uuidv4(), membershipId, role);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant!.userId,
    eventType: "MemberAdded",
    resourceType: "Membership",
    resourceId: membershipId,
    details: { userId, roleCode: role },
  });

  res.status(201).json({ membershipId });
});

// PUT /api/organizations/:orgId/members/:membershipId/roles
router.put("/:orgId/members/:membershipId/roles", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { roles } = (req.body ?? {}) as { roles?: string[] };
  if (!Array.isArray(roles) || roles.length === 0) {
    res.status(400).json({ error: "roles_required" });
    return;
  }
  const invalid = roles.filter((r) => !ASSIGNABLE_ROLES.includes(r));
  if (invalid.length > 0) {
    res.status(400).json({ error: "invalid_role", detail: invalid });
    return;
  }

  const membership = membershipRepo.findById(req.params.membershipId);
  if (!membership || membership.OrganizationId !== req.params.orgId) {
    res.status(404).json({ error: "membership_not_found" });
    return;
  }

  membershipRepo.replaceRoles(req.params.membershipId, roles);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant!.userId,
    eventType: "MemberRolesUpdated",
    resourceType: "Membership",
    resourceId: req.params.membershipId,
    details: { roles },
  });

  res.json({ ok: true });
});

// PATCH /api/organizations/:orgId/members/:membershipId
router.patch("/:orgId/members/:membershipId", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { status } = (req.body ?? {}) as { status?: string };
  const allowed = ["Active", "Suspended", "Removed"];
  if (!status || !allowed.includes(status)) {
    res.status(400).json({ error: "invalid status" });
    return;
  }

  membershipRepo.updateStatus(req.params.membershipId, status);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant!.userId,
    eventType: "MembershipStatusChanged",
    resourceType: "Membership",
    resourceId: req.params.membershipId,
    details: { status },
  });

  res.json({ ok: true });
});

// GET /api/organizations/:orgId/audit — paginated, filterable
router.get("/:orgId/audit", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "25"), 10) || 25));
  const eventType = typeof req.query.eventType === "string" ? req.query.eventType || undefined : undefined;
  const actorUserId = typeof req.query.actorUserId === "string" ? req.query.actorUserId || undefined : undefined;
  const from = typeof req.query.from === "string" ? req.query.from || undefined : undefined;
  const to = typeof req.query.to === "string" ? req.query.to || undefined : undefined;

  const { rows, total } = auditRepo.listByOrganization(req.params.orgId, {
    eventType,
    actorUserId,
    from,
    to,
    page,
    limit,
  });

  const eventTypes = auditRepo.distinctEventTypes(req.params.orgId);

  res.json({ events: rows, total, page, limit, eventTypes });
});

export default router;
