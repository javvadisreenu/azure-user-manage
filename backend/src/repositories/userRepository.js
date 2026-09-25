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
  const existing = findById(userId);
  if (!existing) return;
  getDb()
    .prepare(
      "UPDATE Users SET PrimaryEmail = ?, DisplayName = ? WHERE UserId = ?"
    )
    .run(
      primaryEmail !== undefined ? primaryEmail : existing.PrimaryEmail,
      displayName !== undefined ? displayName : existing.DisplayName,
      userId
    );
}

// Search users across the whole platform (PlatformAdmin directory).
// Returns each user with a count of active org memberships.
export function search({ search, page = 1, limit = 20 } = {}) {
  const offset = (Number(page) - 1) * Number(limit);
  const db = getDb();
  if (search) {
    const like = `%${search}%`;
    return db
      .prepare(
        `SELECT u.*, COUNT(m.MembershipId) AS OrgCount
         FROM Users u
         LEFT JOIN Memberships m ON m.UserId = u.UserId AND m.Status = 'Active'
         WHERE u.DisplayName LIKE ? OR u.PrimaryEmail LIKE ?
         GROUP BY u.UserId
         ORDER BY u.CreatedUtc DESC
         LIMIT ? OFFSET ?`
      )
      .all(like, like, Number(limit), offset);
  }
  return db
    .prepare(
      `SELECT u.*, COUNT(m.MembershipId) AS OrgCount
       FROM Users u
       LEFT JOIN Memberships m ON m.UserId = u.UserId AND m.Status = 'Active'
       GROUP BY u.UserId
       ORDER BY u.CreatedUtc DESC
       LIMIT ? OFFSET ?`
    )
    .all(Number(limit), offset);
}
