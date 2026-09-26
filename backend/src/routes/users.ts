import { Router } from "express";
import * as userRepo from "../repositories/userRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import { requireRole } from "../middleware/tenantContext.js";

const router = Router();

// GET /api/users?search=&page=1&limit=20 — platform-wide user directory
// PlatformAdmin only. Returns users with their active org count.
router.get("/", requireRole("PlatformAdmin"), (req, res) => {
  const { search, page, limit } = req.query as {
    search?: string;
    page?: string;
    limit?: string;
  };
  const users = userRepo.search({
    search,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  res.json(
    users.map((u) => ({
      userId: u.UserId,
      displayName: u.DisplayName,
      primaryEmail: u.PrimaryEmail,
      orgCount: u.OrgCount,
      createdUtc: u.CreatedUtc,
    }))
  );
});

// GET /api/users/:userId/memberships — orgs a user belongs to
// PlatformAdmin only.
router.get("/:userId/memberships", requireRole("PlatformAdmin"), (req, res) => {
  const memberships = membershipRepo.findActiveByUserId(req.params.userId);
  res.json(
    memberships.map((m) => ({
      membershipId: m.MembershipId,
      organizationId: m.OrganizationId,
      organizationName: m.OrganizationName,
      organizationCode: m.OrganizationCode,
      roles: membershipRepo.getRolesForMembership(m.MembershipId),
    }))
  );
});

export default router;
