import { Router } from "express";
import * as invitationService from "../services/invitationService.js";
import * as invitationRepo from "../repositories/invitationRepository.js";
import { requireRole } from "../middleware/tenantContext.js";
import { ASSIGNABLE_ROLES } from "../types.js";

// Mounted behind authenticate + tenantContext at /api/invitations.
const router = Router();

// POST /api/invitations — TenantAdmin creates an invitation
router.post("/", requireRole("TenantAdmin"), (req, res) => {
  const { email, roleCode } = (req.body ?? {}) as { email?: string; roleCode?: string };
  if (!email || !roleCode) {
    res.status(400).json({ error: "email and roleCode are required" });
    return;
  }

  // ASSIGNABLE_ROLES deliberately excludes PlatformAdmin — invitations must
  // never grant platform-wide administration.
  if (!ASSIGNABLE_ROLES.includes(roleCode)) {
    res.status(400).json({ error: "invalid roleCode" });
    return;
  }

  const { invitationId, rawToken } = invitationService.createInvitation({
    organizationId: req.tenant!.organizationId,
    email,
    roleCode,
    createdByUserId: req.tenant!.userId,
  });

  res.status(201).json({
    invitationId,
    invitationLink: `${process.env.FRONTEND_ORIGIN}/accept-invite?token=${rawToken}`,
  });
});

// GET /api/invitations — list pending invitations for the current org
router.get("/", requireRole("TenantAdmin"), (req, res) => {
  const invitations = invitationRepo.findPendingByOrganization(
    req.tenant!.organizationId
  );
  res.json(
    invitations.map((i) => ({
      ...i,
      TokenHash: undefined,
    }))
  );
});

// DELETE /api/invitations/:id — revoke an invitation.
// The invitation must belong to the caller's organization (PlatformAdmin excepted).
router.delete("/:id", requireRole("TenantAdmin"), (req, res) => {
  const invitation = invitationRepo.findById(req.params.id);
  const orgId = req.tenant!.organizationId;
  const isPlatformAdmin = req.tenant!.roles.includes("PlatformAdmin");
  if (!invitation || (invitation.OrganizationId !== orgId && !isPlatformAdmin)) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  invitationRepo.revoke(req.params.id);
  res.json({ ok: true });
});

export default router;
