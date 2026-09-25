import { Router } from "express";
import * as userRepo from "../repositories/userRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";

const router = Router();

// GET /api/me — returns the authenticated user and active tenant context
router.get("/", (req, res) => {
  const user = userRepo.findById(req.tenant.userId);
  res.json({
    user: {
      userId: user.UserId,
      displayName: user.DisplayName,
      primaryEmail: user.PrimaryEmail,
    },
    tenant: {
      organizationId: req.tenant.organizationId,
      organizationName: req.tenant.organizationName,
      organizationCode: req.tenant.organizationCode,
      roles: req.tenant.roles,
    },
  });
});

// PATCH /api/me — update the signed-in user's own profile
router.patch("/", (req, res) => {
  const { displayName, primaryEmail } = req.body;

  if (displayName === undefined && primaryEmail === undefined) {
    return res.status(400).json({ error: "nothing_to_update" });
  }
  if (primaryEmail !== undefined && primaryEmail !== null && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(primaryEmail)) {
    return res.status(400).json({ error: "invalid_email" });
  }

  userRepo.update(req.tenant.userId, { displayName, primaryEmail });

  auditRepo.log({
    organizationId: req.tenant.organizationId,
    actorUserId: req.tenant.userId,
    eventType: "UserProfileUpdated",
    resourceType: "User",
    resourceId: req.tenant.userId,
    details: { displayName, primaryEmail },
  });

  const user = userRepo.findById(req.tenant.userId);
  res.json({
    user: {
      userId: user.UserId,
      displayName: user.DisplayName,
      primaryEmail: user.PrimaryEmail,
    },
  });
});

export default router;
