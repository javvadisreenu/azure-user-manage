import { v4 as uuidv4 } from "uuid";
import { execute, query, queryOne, withTransaction } from "../db/client.js";
import type { Membership, MembershipWithOrg, MemberListRow } from "../types.js";

export function findActiveByUserId(userId: string): MembershipWithOrg[] {
  return query<MembershipWithOrg>(
    `SELECT m.*, o.Name AS OrganizationName, o.Code AS OrganizationCode
     FROM Memberships m
     JOIN Organizations o ON o.OrganizationId = m.OrganizationId
     WHERE m.UserId = ? AND m.Status = 'Active' AND o.Status = 'Active'`,
    userId
  );
}

export function findByOrganizationAndUser(
  organizationId: string,
  userId: string
): Membership | undefined {
  return queryOne<Membership>(
    "SELECT * FROM Memberships WHERE OrganizationId = ? AND UserId = ?",
    organizationId,
    userId
  );
}

export function findById(membershipId: string): Membership | undefined {
  return queryOne<Membership>(
    "SELECT * FROM Memberships WHERE MembershipId = ?",
    membershipId
  );
}

export function getRolesForMembership(membershipId: string): string[] {
  return query<{ RoleCode: string }>(
    `SELECT r.RoleCode FROM MembershipRoles mr
     JOIN Roles r ON r.RoleId = mr.RoleId
     WHERE mr.MembershipId = ?`,
    membershipId
  ).map((r) => r.RoleCode);
}

export function create(m: {
  membershipId: string;
  organizationId: string;
  userId: string;
  status: string;
}): void {
  execute(
    "INSERT INTO Memberships (MembershipId, OrganizationId, UserId, Status) VALUES (?, ?, ?, ?)",
    m.membershipId,
    m.organizationId,
    m.userId,
    m.status
  );
}

export function assignRole(membershipRoleId: string, membershipId: string, roleCode: string): void {
  const role = queryOne<{ RoleId: string }>(
    "SELECT RoleId FROM Roles WHERE RoleCode = ?",
    roleCode
  );
  if (!role) throw new Error(`Unknown role: ${roleCode}`);
  execute(
    "INSERT OR IGNORE INTO MembershipRoles (MembershipRoleId, MembershipId, RoleId) VALUES (?, ?, ?)",
    membershipRoleId,
    membershipId,
    role.RoleId
  );
}

export function replaceRoles(membershipId: string, roleCodes: string[]): void {
  for (const code of roleCodes) {
    const role = queryOne<{ RoleId: string }>(
      "SELECT RoleId FROM Roles WHERE RoleCode = ?",
      code
    );
    if (!role) throw new Error(`Unknown role: ${code}`);
  }
  withTransaction(() => {
    execute("DELETE FROM MembershipRoles WHERE MembershipId = ?", membershipId);
    for (const code of roleCodes) {
      assignRole(uuidv4(), membershipId, code);
    }
  });
}

export interface MemberFilter {
  search?: string;
  page?: number;
  limit?: number;
}

export function listByOrganization(
  organizationId: string,
  filter: MemberFilter = {}
): { rows: MemberListRow[]; total: number } {
  const { search, page = 1, limit = 25 } = filter;

  const conditions = ["m.OrganizationId = ?"];
  const params: unknown[] = [organizationId];

  if (search) {
    conditions.push("(u.DisplayName LIKE ? OR u.PrimaryEmail LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const where = "WHERE " + conditions.join(" AND ");
  const total =
    queryOne<{ n: number }>(
      `SELECT COUNT(DISTINCT m.MembershipId) AS n
       FROM Memberships m JOIN Users u ON u.UserId = m.UserId ${where}`,
      ...params
    )?.n ?? 0;

  const offset = (page - 1) * limit;
  const rows = query<MemberListRow>(
    `SELECT m.MembershipId, m.Status, m.CreatedUtc,
            u.UserId, u.DisplayName, u.PrimaryEmail,
            GROUP_CONCAT(r.RoleCode) AS Roles
     FROM Memberships m
     JOIN Users u ON u.UserId = m.UserId
     LEFT JOIN MembershipRoles mr ON mr.MembershipId = m.MembershipId
     LEFT JOIN Roles r ON r.RoleId = mr.RoleId
     ${where}
     GROUP BY m.MembershipId
     ORDER BY m.CreatedUtc DESC
     LIMIT ? OFFSET ?`,
    ...params, limit, offset
  );

  return { rows, total };
}

export function countActiveByOrganization(organizationId: string): number {
  return (
    queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM Memberships WHERE OrganizationId = ? AND Status = 'Active'",
      organizationId
    )?.n ?? 0
  );
}

export function updateStatus(membershipId: string, status: string): void {
  execute("UPDATE Memberships SET Status = ? WHERE MembershipId = ?", status, membershipId);
}

export function hasAnyPlatformAdmin(): boolean {
  const row = queryOne<{ n: number }>(
    `SELECT COUNT(*) AS n
     FROM MembershipRoles mr
     JOIN Roles r ON r.RoleId = mr.RoleId
     WHERE r.RoleCode = 'PlatformAdmin'`
  );
  return (row?.n ?? 0) > 0;
}
