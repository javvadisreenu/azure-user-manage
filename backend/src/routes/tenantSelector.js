import { Router } from "express";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

// GET /api/tenant-selector — returns orgs the authenticated user belongs to
// Used when the user has multiple memberships and must pick one
router.get("/", authenticate, (req, res) => {
  const identity = userIdentityRepo.findByIssuerAndSubject(
    req.identity.issuer,
    req.identity.subject
  );
  if (!identity) {
    return res.status(403).json({ error: "membership_required" });
  }

  const memberships = membershipRepo.findActiveByUserId(identity.UserId);
  res.json(
    memberships.map((m) => ({
      organizationId: m.OrganizationId,
      name: m.OrganizationName,
      code: m.OrganizationCode,
    }))
  );
});

export default router;
