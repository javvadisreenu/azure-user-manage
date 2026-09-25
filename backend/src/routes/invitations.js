import { Router } from "express";
import * as invitationService from "../services/invitationService.js";
import * as provisioningService from "../services/provisioningService.js";
import * as invitationRepo from "../repositories/invitationRepository.js";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import { requireRole } from "../middleware/tenantContext.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// POST /api/invitations — TenantAdmin creates an invitation
router.post("/", requireRole("TenantAdmin"), (req, res) => {
  const { email, roleCode } = req.body;
  if (!email || !roleCode) return res.status(400).json({ error: "email and roleCode are required" });

  const allowed = ["TenantAdmin", "Manager", "User", "ReadOnly"];
  if (!allowed.includes(roleCode)) return res.status(400).json({ error: "invalid roleCode" });

  const { invitationId, rawToken } = invitationService.createInvitation({
    organizationId: req.tenant.organizationId,
    email,
    roleCode,
    createdByUserId: req.tenant.userId,
  });

  res.status(201).json({
    invitationId,
    invitationLink: `${process.env.FRONTEND_ORIGIN}/accept-invite?token=${rawToken}`,
  });
});

// GET /api/invitations — list pending invitations for the current org
router.get("/", requireRole("TenantAdmin"), (req, res) => {
  const invitations = invitationRepo.findPendingByOrganization(req.tenant.organizationId);
  res.json(invitations.map((i) => ({ ...i, TokenHash: undefined })));
});

// DELETE /api/invitations/:id — revoke invitation
router.delete("/:id", requireRole("TenantAdmin"), (req, res) => {
  invitationRepo.revoke(req.params.id);
  res.json({ ok: true });
});

// POST /api/invitations/accept — called after Entra sign-in with a token
// The user must be authenticated but NOT yet have a tenant context
router.post("/accept", authenticate, async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token is required" });

  const invitation = invitationService.validateInvitation(token);
  if (!invitation) return res.status(400).json({ error: "invitation_invalid_or_expired" });

  const existing = userIdentityRepo.findByIssuerAndSubject(req.identity.issuer, req.identity.subject);
  if (existing) {
    return res.status(409).json({ error: "identity_already_provisioned" });
  }

  const { userId } = provisioningService.provisionFromInvitation(invitation, {
    issuer: req.identity.issuer,
    subject: req.identity.subject,
    oid: req.identity.oid,
    email: req.identity.email,
    name: req.identity.name,
  });

  res.status(201).json({ userId, organizationId: invitation.OrganizationId });
});

export default router;
