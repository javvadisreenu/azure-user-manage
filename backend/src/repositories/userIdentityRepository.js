import { getDb } from "../data/db.js";

export function findByIssuerAndSubject(issuer, subject) {
  return getDb()
    .prepare(
      "SELECT * FROM UserIdentities WHERE Issuer = ? AND Subject = ?"
    )
    .get(issuer, subject);
}

export function create({ userIdentityId, userId, issuer, subject, entraObjectId, provider }) {
  getDb()
    .prepare(
      `INSERT INTO UserIdentities
         (UserIdentityId, UserId, Issuer, Subject, EntraObjectId, Provider)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(userIdentityId, userId, issuer, subject, entraObjectId ?? null, provider ?? null);
}
