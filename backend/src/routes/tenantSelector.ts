import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import * as userRepo from "../repositories/userRepository.js";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import * as organizationRepo from "../repositories/organizationRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";
import { authenticate } from "../middleware/authenticate.js";
import { withTransaction } from "../db/client.js";
import type { AuthIdentity } from "../types.js";

/**
 * Auto-provision a first-time user:
 *  1. Create a User record
 *  2. Link their Entra identity (issuer + subject)
 *  3. Create a personal Organization
 *  4. Add an Active membership:
 *     - The FIRST user ever to log in bootstraps the platform as PlatformAdmin.
 *     - Everyone after that only becomes TenantAdmin of their personal org —
 *       global administration is never granted automatically.
 *
 * Runs inside a SQLite transaction so it's all-or-nothing.
 */
function autoProvision(identity: AuthIdentity): {
  userId: string;
  organizationId: string;
  membershipId: string;
  role: string;
} {
  return withTransaction(() => {
    const role = membershipRepo.hasAnyPlatformAdmin() ? "TenantAdmin" : "PlatformAdmin";

    const userId = uuidv4();
    userRepo.create({
      userId,
      primaryEmail: identity.email,
      displayName: identity.name,
    });

    const userIdentityId = uuidv4();
    userIdentityRepo.create({
      userIdentityId,
      userId,
      issuer: identity.issuer,
      subject: identity.subject,
      entraObjectId: identity.oid,
      provider: "entra-external-id",
    });

    // Create a default org named after the user or email
    const orgName = identity.name ? `${identity.name}'s Organization` : `Organization`;
    const orgCode = `org-${userId.slice(0, 8)}`;
    const organizationId = uuidv4();
    organizationRepo.create({
      organizationId,
      code: orgCode,
      name: orgName,
      status: "Active",
    });

    const membershipId = uuidv4();
    membershipRepo.create({
      membershipId,
      organizationId,
      userId,
      status: "Active",
    });

    membershipRepo.assignRole(uuidv4(), membershipId, role);

    auditRepo.log({
      organizationId,
      actorUserId: userId,
      eventType: "UserAutoProvisioned",
      resourceType: "User",
      resourceId: userId,
      details: { email: identity.email, method: "first-login", role },
    });

    return { userId, organizationId, membershipId, role };
  });
}

// GET /api/tenant-selector — returns orgs the authenticated user belongs to
// Auto-provisions the user on first login if no identity record exists.
// Mounted publicly (it carries its own authenticate) so first-time users —
// who have no membership yet — are not blocked by the tenantContext gate.
const router = Router();

router.get("/", authenticate, (req, res) => {
  const claims = req.identity!; // set by authenticate()
  let identity = userIdentityRepo.findByIssuerAndSubject(claims.issuer, claims.subject);

  // First-time user — auto-provision
  if (!identity) {
    try {
      const result = autoProvision(claims);
      console.log(
        `[provision] Auto-provisioned ${claims.email || claims.subject} as ${result.role} of "${result.organizationId}"`
      );
      identity = userIdentityRepo.findByIssuerAndSubject(claims.issuer, claims.subject);
    } catch (err) {
      console.error("[provision] Auto-provision failed:", err);
      res.status(500).json({ error: "provisioning_failed" });
      return;
    }
  }

  const memberships = membershipRepo.findActiveByUserId(identity!.UserId);
  res.json(
    memberships.map((m) => ({
      organizationId: m.OrganizationId,
      name: m.OrganizationName,
      code: m.OrganizationCode,
    }))
  );
});

export default router;
