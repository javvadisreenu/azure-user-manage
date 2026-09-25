import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as invitationRepo from "../repositories/invitationRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";

const EXPIRY_HOURS = 72;

export function createInvitation({ organizationId, email, roleCode, createdByUserId }) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiryUtc = new Date(Date.now() + EXPIRY_HOURS * 3600 * 1000).toISOString();
  const invitationId = uuidv4();

  invitationRepo.create({ invitationId, organizationId, email, roleCode, tokenHash, expiryUtc, createdByUserId });

  auditRepo.log({
    organizationId,
    actorUserId: createdByUserId,
    eventType: "InvitationCreated",
    resourceType: "Invitation",
    resourceId: invitationId,
    details: { email, roleCode },
  });

  return { invitationId, rawToken };
}

export function validateInvitation(rawToken) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  invitationRepo.expireStale();
  const invitation = invitationRepo.findByTokenHash(tokenHash);

  if (!invitation) return null;
  if (invitation.Status !== "Pending") return null;
  if (new Date(invitation.ExpiryUtc) < new Date()) return null;

  return invitation;
}
