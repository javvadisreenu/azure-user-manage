import { v4 as uuidv4 } from "uuid";
import { getDb } from "../data/db.js";
import * as userRepo from "../repositories/userRepository.js";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import * as invitationRepo from "../repositories/invitationRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";

/**
 * Provision a new user from an accepted invitation.
 * Runs as a single SQLite transaction.
 */
export function provisionFromInvitation(invitation, identityClaims) {
  const db = getDb();

  return db.transaction(() => {
    const userId = uuidv4();
    userRepo.create({
      userId,
      primaryEmail: identityClaims.email ?? null,
      displayName: identityClaims.name ?? null,
    });

    const userIdentityId = uuidv4();
    userIdentityRepo.create({
      userIdentityId,
      userId,
      issuer: identityClaims.issuer,
      subject: identityClaims.subject,
      entraObjectId: identityClaims.oid ?? null,
      provider: identityClaims.provider ?? null,
    });

    const membershipId = uuidv4();
    membershipRepo.create({
      membershipId,
      organizationId: invitation.OrganizationId,
      userId,
      status: "Active",
    });

    membershipRepo.assignRole(uuidv4(), membershipId, invitation.RoleCode);
    invitationRepo.markAccepted(invitation.InvitationId);

    auditRepo.log({
      organizationId: invitation.OrganizationId,
      actorUserId: userId,
      eventType: "UserProvisioned",
      resourceType: "User",
      resourceId: userId,
      details: { via: "invitation", invitationId: invitation.InvitationId },
    });

    return { userId, membershipId };
  })();
}
