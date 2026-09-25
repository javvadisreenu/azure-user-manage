import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import * as orgRepo from "../repositories/organizationRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import * as userRepo from "../repositories/userRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";
import { requireRole } from "../middleware/tenantContext.js";

const router = Router();

const VALID_ROLES = ["PlatformAdmin", "TenantAdmin", "Manager", "User", "ReadOnly"];

// Guard: the actor may only touch the org their session is scoped to,
// unless they are a PlatformAdmin (who can touch any org).
function assertOrgAccess(req, res) {
  if (
    req.tenant.organizationId !== req.params.orgId &&
    !req.tenant.roles.includes("PlatformAdmin")
  ) {
    res.status(403).json({ error: "insufficient_role" });
    return false;
  }
  return true;
}

// GET /api/organizations — PlatformAdmin only: list all organizations
router.get("/", requireRole("PlatformAdmin"), (req, res) => {
  res.json(orgRepo.list());
});

// POST /api/organizations — PlatformAdmin only: create an organization.
// The creator is automatically added as a TenantAdmin member so they can
// switch into and manage the new org right away.
router.post("/", requireRole("PlatformAdmin"), (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name and code are required" });

  if (orgRepo.findByCode(code)) {
    return res.status(409).json({ error: "code_taken" });
  }

  const organizationId = uuidv4();
  orgRepo.create({ organizationId, code, name, status: "Active" });

  // Add the creator as a TenantAdmin of the new org
  const membershipId = uuidv4();
  membershipRepo.create({
    membershipId,
    organizationId,
    userId: req.tenant.userId,
    status: "Active",
  });
  membershipRepo.assignRole(uuidv4(), membershipId, "TenantAdmin");

  auditRepo.log({
    organizationId,
    actorUserId: req.tenant.userId,
    eventType: "OrganizationCreated",
    resourceType: "Organization",
    resourceId: organizationId,
    details: { name, code },
  });

  res.status(201).json({ organizationId, membershipId });
});

// GET /api/organizations/:orgId — TenantAdmin or member of that org
router.get("/:orgId", (req, res) => {
  if (req.tenant.organizationId !== req.params.orgId && !req.tenant.roles.includes("PlatformAdmin")) {
    return res.status(403).json({ error: "insufficient_role" });
  }
  const org = orgRepo.findById(req.params.orgId);
  if (!org) return res.status(404).json({ error: "not_found" });
  res.json(org);
});

// PATCH /api/organizations/:orgId — rename or change status
router.patch("/:orgId", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { name, status } = req.body;
  if (name === undefined && status === undefined) {
    return res.status(400).json({ error: "nothing_to_update" });
  }
  if (status !== undefined && !["Active", "Suspended", "Archived"].includes(status)) {
    return res.status(400).json({ error: "invalid_status" });
  }

  if (name !== undefined) orgRepo.updateName(req.params.orgId, name);
  if (status !== undefined) orgRepo.updateStatus(req.params.orgId, status);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant.userId,
    eventType: "OrganizationUpdated",
    resourceType: "Organization",
    resourceId: req.params.orgId,
    details: { name, status },
  });

  res.json({ ok: true });
});

// GET /api/organizations/:orgId/members
router.get("/:orgId/members", requireRole("TenantAdmin", "Manager"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;
  const members = membershipRepo.listByOrganization(req.params.orgId);
  res.json(members);
});

// POST /api/organizations/:orgId/members — add an EXISTING user to this org
// Body: { userId, roleCode }
router.post("/:orgId/members", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { userId, roleCode } = req.body;
  if (!userId) return res.status(400).json({ error: "userId_required" });

  const role = roleCode || "User";
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }

  const user = userRepo.findById(userId);
  if (!user) return res.status(404).json({ error: "user_not_found" });

  const existing = membershipRepo.findByOrganizationAndUser(req.params.orgId, userId);
  if (existing) return res.status(409).json({ error: "already_member" });

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
    actorUserId: req.tenant.userId,
    eventType: "MemberAdded",
    resourceType: "Membership",
    resourceId: membershipId,
    details: { userId, roleCode: role },
  });

  res.status(201).json({ membershipId });
});

// PUT /api/organizations/:orgId/members/:membershipId/roles — replace a member's roles
// Body: { roles: ["TenantAdmin", "Manager"] }
router.put("/:orgId/members/:membershipId/roles", requireRole("TenantAdmin"), (req, res) => {
  if (!assertOrgAccess(req, res)) return;

  const { roles } = req.body;
  if (!Array.isArray(roles) || roles.length === 0) {
    return res.status(400).json({ error: "roles_required" });
  }
  const invalid = roles.filter((r) => !VALID_ROLES.includes(r));
  if (invalid.length) {
    return res.status(400).json({ error: "invalid_role", detail: invalid });
  }

  const membership = membershipRepo.findById(req.params.membershipId);
  if (!membership || membership.OrganizationId !== req.params.orgId) {
    return res.status(404).json({ error: "membership_not_found" });
  }

  membershipRepo.replaceRoles(req.params.membershipId, roles);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant.userId,
    eventType: "MemberRolesUpdated",
    resourceType: "Membership",
    resourceId: req.params.membershipId,
    details: { roles },
  });

  res.json({ ok: true });
});

// PATCH /api/organizations/:orgId/members/:membershipId — update membership status
router.patch("/:orgId/members/:membershipId", requireRole("TenantAdmin"), (req, res) => {
  if (req.tenant.organizationId !== req.params.orgId && !req.tenant.roles.includes("PlatformAdmin")) {
    return res.status(403).json({ error: "insufficient_role" });
  }
  const { status } = req.body;
  const allowed = ["Active", "Suspended", "Removed"];
  if (!allowed.includes(status)) return res.status(400).json({ error: "invalid status" });

  membershipRepo.updateStatus(req.params.membershipId, status);

  auditRepo.log({
    organizationId: req.params.orgId,
    actorUserId: req.tenant.userId,
    eventType: "MembershipStatusChanged",
    resourceType: "Membership",
    resourceId: req.params.membershipId,
    details: { status },
  });

  res.json({ ok: true });
});

// GET /api/organizations/:orgId/audit
router.get("/:orgId/audit", requireRole("TenantAdmin"), (req, res) => {
  if (req.tenant.organizationId !== req.params.orgId && !req.tenant.roles.includes("PlatformAdmin")) {
    return res.status(403).json({ error: "insufficient_role" });
  }
  const events = auditRepo.listByOrganization(req.params.orgId);
  res.json(events);
});

export default router;
