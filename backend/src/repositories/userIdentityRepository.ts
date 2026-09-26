import { execute, query, queryOne } from "../db/client.js";
import type { UserIdentityRow } from "../types.js";

export function findByIssuerAndSubject(
  issuer: string,
  subject: string
): UserIdentityRow | undefined {
  return queryOne<UserIdentityRow>(
    "SELECT * FROM UserIdentities WHERE Issuer = ? AND Subject = ?",
    issuer,
    subject
  );
}

export function create(identity: {
  userIdentityId: string;
  userId: string;
  issuer: string;
  subject: string;
  entraObjectId: string | null;
  provider: string | null;
}): void {
  execute(
    `INSERT INTO UserIdentities
       (UserIdentityId, UserId, Issuer, Subject, EntraObjectId, Provider)
     VALUES (?, ?, ?, ?, ?, ?)`,
    identity.userIdentityId,
    identity.userId,
    identity.issuer,
    identity.subject,
    identity.entraObjectId,
    identity.provider
  );
}
