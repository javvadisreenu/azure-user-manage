import { Router } from "express";
import * as invitationService from "../services/invitationService.js";
import * as provisioningService from "../services/provisioningService.js";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import { authenticate } from "../middleware/authenticate.js";

// Mounted publicly at POST /api/invitations/accept (see app.ts).
// This endpoint must stay OUTSIDE the global tenantContext gate: invitees
// authenticate but have no membership yet — that's the whole point.
// Only the accept action lives here; invitation create/list/revoke remain
// on the protected /api/invitations router.
const router = Router();

router.post("/", authenticate, (req, res) => {
  const { token } = (req.body ?? {}) as { token?: string };
  if (!token) {
    res.status(400).json({ error: "token is required" });
    return;
  }

  const invitation = invitationService.validateInvitation(token);
  if (!invitation) {
    res.status(400).json({ error: "invitation_invalid_or_expired" });
    return;
  }

  const identity = req.identity!; // set by authenticate()
  const existing = userIdentityRepo.findByIssuerAndSubject(
    identity.issuer,
    identity.subject
  );
  if (existing) {
    res.status(409).json({ error: "identity_already_provisioned" });
    return;
  }

  const { userId } = provisioningService.provisionFromInvitation(invitation, identity);

  res.status(201).json({ userId, organizationId: invitation.OrganizationId });
});

export default router;
