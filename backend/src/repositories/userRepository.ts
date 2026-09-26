import { execute, query, queryOne } from "../db/client.js";
import type { User, UserSearchRow } from "../types.js";

export function findById(userId: string): User | undefined {
  return queryOne<User>("SELECT * FROM Users WHERE UserId = ?", userId);
}

export function create(user: {
  userId: string;
  primaryEmail: string | null;
  displayName: string | null;
}): void {
  execute(
    "INSERT INTO Users (UserId, PrimaryEmail, DisplayName) VALUES (?, ?, ?)",
    user.userId,
    user.primaryEmail,
    user.displayName
  );
}

export function update(
  userId: string,
  patch: { primaryEmail?: string | null; displayName?: string | null }
): void {
  const existing = findById(userId);
  if (!existing) return;
  execute(
    "UPDATE Users SET PrimaryEmail = ?, DisplayName = ? WHERE UserId = ?",
    patch.primaryEmail !== undefined ? patch.primaryEmail : existing.PrimaryEmail,
    patch.displayName !== undefined ? patch.displayName : existing.DisplayName,
    userId
  );
}

// Search users across the whole platform (PlatformAdmin directory).
// Returns each user with a count of active org memberships.
export function search({
  search,
  page = 1,
  limit = 20,
}: { search?: string; page?: number; limit?: number } = {}): UserSearchRow[] {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const offset = (safePage - 1) * safeLimit;

  if (search) {
    const like = `%${search}%`;
    return query<UserSearchRow>(
      `SELECT u.*, COUNT(m.MembershipId) AS OrgCount
       FROM Users u
       LEFT JOIN Memberships m ON m.UserId = u.UserId AND m.Status = 'Active'
       WHERE u.DisplayName LIKE ? OR u.PrimaryEmail LIKE ?
       GROUP BY u.UserId
       ORDER BY u.CreatedUtc DESC
       LIMIT ? OFFSET ?`,
      like,
      like,
      safeLimit,
      offset
    );
  }

  return query<UserSearchRow>(
    `SELECT u.*, COUNT(m.MembershipId) AS OrgCount
     FROM Users u
     LEFT JOIN Memberships m ON m.UserId = u.UserId AND m.Status = 'Active'
     GROUP BY u.UserId
     ORDER BY u.CreatedUtc DESC
     LIMIT ? OFFSET ?`,
    safeLimit,
    offset
  );
}
