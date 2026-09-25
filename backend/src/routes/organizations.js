import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import * as orgRepo from "../repositories/organizationRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";
import { requireRole } from "../middleware/tenantContext.js";

const router = Router();

// GET /api/organizations — PlatformAdmin only: list all organizations
router.get("/", requireRole("PlatformAdmin"), (req, res) => {
  res.json(orgRepo.list());
});

// POST /api/organizations — PlatformAdmin only: create an organization
router.post("/", requireRole("PlatformAdmin"), (req, res) => {
  const { name, code } = req.body;
  if (!name || !code) return res.status(400).json({ error: "name and code are required" });

  const organizationId = uuidv4();
  orgRepo.create({ organizationId, code, name, status: "Active" });

  auditRepo.log({
    organizationId,
    actorUserId: req.tenant.userId,
    eventType: "OrganizationCreated",
    resourceType: "Organization",
    resourceId: organizationId,
    details: { name, code },
  });

  res.status(201).json({ organizationId });
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

// GET /api/organizations/:orgId/members
router.get("/:orgId/members", requireRole("TenantAdmin", "Manager"), (req, res) => {
  if (req.tenant.organizationId !== req.params.orgId && !req.tenant.roles.includes("PlatformAdmin")) {
    return res.status(403).json({ error: "insufficient_role" });
  }
  const members = membershipRepo.listByOrganization(req.params.orgId);
  res.json(members);
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
