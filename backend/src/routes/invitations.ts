import { Router } from "express";
import * as invitationService from "../services/invitationService.js";
import * as invitationRepo from "../repositories/invitationRepository.js";
import { requireRole } from "../middleware/tenantContext.js";
import { ASSIGNABLE_ROLES } from "../types.js";

const router = Router();

// POST /api/invitations — TenantAdmin creates an invitation
router.post("/", requireRole("TenantAdmin"), (req, res) => {
  const { email, roleCode } = (req.body ?? {}) as { email?: string; roleCode?: string };
  if (!email || !roleCode) {
    res.status(400).json({ error: "email and roleCode are required" });
    return;
  }

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

// POST /api/invitations/bulk — batch create up to 50 invitations from CSV upload
router.post("/bulk", requireRole("TenantAdmin"), (req, res) => {
  const { invitations } = (req.body ?? {}) as {
    invitations?: Array<{ email: string; roleCode?: string }>;
  };
  if (!Array.isArray(invitations) || invitations.length === 0) {
    res.status(400).json({ error: "invitations array required" });
    return;
  }
  if (invitations.length > 50) {
    res.status(400).json({ error: "max 50 invitations per batch" });
    return;
  }

  const results = invitations.map((inv) => {
    const role = inv.roleCode || "User";
    if (!inv.email) return { email: inv.email, status: "error", error: "email required" };
    if (!ASSIGNABLE_ROLES.includes(role))
      return { email: inv.email, status: "error", error: `invalid role: ${role}` };

    try {
      const { invitationId, rawToken } = invitationService.createInvitation({
        organizationId: req.tenant!.organizationId,
        email: inv.email,
        roleCode: role,
        createdByUserId: req.tenant!.userId,
      });
      return {
        email: inv.email,
        status: "created",
        invitationId,
        invitationLink: `${process.env.FRONTEND_ORIGIN}/accept-invite?token=${rawToken}`,
      };
    } catch (err: unknown) {
      return { email: inv.email, status: "error", error: (err as Error).message };
    }
  });

  res.json({ results });
});

// GET /api/invitations — list pending invitations for the current org
router.get("/", requireRole("TenantAdmin"), (req, res) => {
  const invitations = invitationRepo.findPendingByOrganization(req.tenant!.organizationId);
  res.json(
    invitations.map((i) => ({
      ...i,
      TokenHash: undefined,
    }))
  );
});

// DELETE /api/invitations/:id — revoke an invitation
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
