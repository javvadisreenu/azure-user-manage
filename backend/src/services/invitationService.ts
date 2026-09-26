import { createHash, randomBytes } from "crypto";
import { v4 as uuidv4 } from "uuid";
import * as invitationRepo from "../repositories/invitationRepository.js";
import * as auditRepo from "../repositories/auditRepository.js";
import type { Invitation } from "../types.js";

const EXPIRY_HOURS = 72;

export function createInvitation(input: {
  organizationId: string;
  email: string;
  roleCode: string;
  createdByUserId: string;
}): { invitationId: string; rawToken: string } {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiryUtc = new Date(Date.now() + EXPIRY_HOURS * 3600 * 1000).toISOString();
  const invitationId = uuidv4();

  invitationRepo.create({
    invitationId,
    organizationId: input.organizationId,
    email: input.email,
    roleCode: input.roleCode,
    tokenHash,
    expiryUtc,
    createdByUserId: input.createdByUserId,
  });

  auditRepo.log({
    organizationId: input.organizationId,
    actorUserId: input.createdByUserId,
    eventType: "InvitationCreated",
    resourceType: "Invitation",
    resourceId: invitationId,
    details: { email: input.email, roleCode: input.roleCode },
  });

  return { invitationId, rawToken };
}

export function validateInvitation(rawToken: string): Invitation | null {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  invitationRepo.expireStale();
  const invitation = invitationRepo.findByTokenHash(tokenHash);

  if (!invitation) return null;
  if (invitation.Status !== "Pending") return null;
  if (new Date(invitation.ExpiryUtc) < new Date()) return null;

  return invitation;
}
