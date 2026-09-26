import { Router } from "express";
import * as userRepo from "../repositories/userRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";

const router = Router();

// GET /api/me — returns the authenticated user and active tenant context
router.get("/", (req, res) => {
  const tenant = req.tenant!;
  const user = userRepo.findById(tenant.userId);
  if (!user) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json({
    user: {
      userId: user.UserId,
      displayName: user.DisplayName,
      primaryEmail: user.PrimaryEmail,
    },
    tenant: {
      organizationId: tenant.organizationId,
      organizationName: tenant.organizationName,
      organizationCode: tenant.organizationCode,
      roles: tenant.roles,
    },
  });
});

// PATCH /api/me — update the signed-in user's own profile
router.patch("/", (req, res) => {
  const tenant = req.tenant!;
  const { displayName, primaryEmail } = (req.body ?? {}) as {
    displayName?: string | null;
    primaryEmail?: string | null;
  };

  if (displayName === undefined && primaryEmail === undefined) {
    res.status(400).json({ error: "nothing_to_update" });
    return;
  }
  if (
    primaryEmail !== undefined &&
    primaryEmail !== null &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(primaryEmail)
  ) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }

  userRepo.update(tenant.userId, { displayName, primaryEmail });

  auditRepo.log({
    organizationId: tenant.organizationId,
    actorUserId: tenant.userId,
    eventType: "UserProfileUpdated",
    resourceType: "User",
    resourceId: tenant.userId,
    details: { displayName, primaryEmail },
  });

  const user = userRepo.findById(tenant.userId)!;
  res.json({
    user: {
      userId: user.UserId,
      displayName: user.DisplayName,
      primaryEmail: user.PrimaryEmail,
    },
  });
});

export default router;
