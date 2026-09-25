import { getDb } from "../data/db.js";

export function findById(userId) {
  return getDb()
    .prepare("SELECT * FROM Users WHERE UserId = ?")
    .get(userId);
}

export function create({ userId, primaryEmail, displayName }) {
  getDb()
    .prepare(
      "INSERT INTO Users (UserId, PrimaryEmail, DisplayName) VALUES (?, ?, ?)"
    )
    .run(userId, primaryEmail ?? null, displayName ?? null);
}

export function update(userId, { primaryEmail, displayName }) {
  getDb()
    .prepare(
      "UPDATE Users SET PrimaryEmail = ?, DisplayName = ? WHERE UserId = ?"
    )
    .run(primaryEmail ?? null, displayName ?? null, userId);
}
