import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDb } from "../data/db.js";
import * as userRepo from "../repositories/userRepository.js";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import * as organizationRepo from "../repositories/organizationRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";
import { authenticate } from "../middleware/authenticate.js";

const router = Router();

/**
 * Auto-provision a first-time user:
 *  1. Create a User record
 *  2. Link their Entra identity (issuer + subject)
 *  3. Create a personal Organization
 *  4. Add an Active membership with PlatformAdmin role
 *
 * Runs inside a SQLite transaction so it's all-or-nothing.
 */
function autoProvision(identity) {
  const db = getDb();

  return db.transaction(() => {
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
    const orgName = identity.name
      ? `${identity.name}'s Organization`
      : `Organization`;
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

    membershipRepo.assignRole(uuidv4(), membershipId, "PlatformAdmin");

    auditRepo.log({
      organizationId,
      actorUserId: userId,
      eventType: "UserAutoProvisioned",
      resourceType: "User",
      resourceId: userId,
      details: { email: identity.email, method: "first-login" },
    });

    console.log(
      `[provision] Auto-provisioned user ${identity.email || identity.subject} → org ${orgName} (${organizationId})`
    );

    return { userId, organizationId, membershipId };
  })();
}

// GET /api/tenant-selector — returns orgs the authenticated user belongs to
// Auto-provisions the user on first login if no identity record exists.
router.get("/", authenticate, (req, res) => {
  let identity = userIdentityRepo.findByIssuerAndSubject(
    req.identity.issuer,
    req.identity.subject
  );

  // First-time user — auto-provision
  if (!identity) {
    try {
      autoProvision(req.identity);
      identity = userIdentityRepo.findByIssuerAndSubject(
        req.identity.issuer,
        req.identity.subject
      );
    } catch (err) {
      console.error("[provision] Auto-provision failed:", err);
      return res.status(500).json({ error: "provisioning_failed" });
    }
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
