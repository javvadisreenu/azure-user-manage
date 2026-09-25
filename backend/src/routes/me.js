import { Router } from "express";
import * as userRepo from "../repositories/userRepository.js";

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

export default router;
