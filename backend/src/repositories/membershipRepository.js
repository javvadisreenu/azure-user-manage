import { getDb } from "../data/db.js";

export function findActiveByUserId(userId) {
  return getDb()
    .prepare(
      `SELECT m.*, o.Name AS OrganizationName, o.Code AS OrganizationCode
       FROM Memberships m
       JOIN Organizations o ON o.OrganizationId = m.OrganizationId
       WHERE m.UserId = ? AND m.Status = 'Active' AND o.Status = 'Active'`
    )
    .all(userId);
}

export function findByOrganizationAndUser(organizationId, userId) {
  return getDb()
    .prepare(
      "SELECT * FROM Memberships WHERE OrganizationId = ? AND UserId = ?"
    )
    .get(organizationId, userId);
}

export function getRolesForMembership(membershipId) {
  return getDb()
    .prepare(
      `SELECT r.RoleCode FROM MembershipRoles mr
       JOIN Roles r ON r.RoleId = mr.RoleId
       WHERE mr.MembershipId = ?`
    )
    .all(membershipId)
    .map((r) => r.RoleCode);
}

export function create({ membershipId, organizationId, userId, status }) {
  getDb()
    .prepare(
      `INSERT INTO Memberships (MembershipId, OrganizationId, UserId, Status)
       VALUES (?, ?, ?, ?)`
    )
    .run(membershipId, organizationId, userId, status);
}

export function assignRole(membershipRoleId, membershipId, roleCode) {
  const role = getDb()
    .prepare("SELECT RoleId FROM Roles WHERE RoleCode = ?")
    .get(roleCode);
  if (!role) throw new Error(`Unknown role: ${roleCode}`);
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO MembershipRoles (MembershipRoleId, MembershipId, RoleId) VALUES (?, ?, ?)"
    )
    .run(membershipRoleId, membershipId, role.RoleId);
}

export function listByOrganization(organizationId) {
  return getDb()
    .prepare(
      `SELECT m.MembershipId, m.Status, m.CreatedUtc,
              u.UserId, u.DisplayName, u.PrimaryEmail,
              GROUP_CONCAT(r.RoleCode) AS Roles
       FROM Memberships m
       JOIN Users u ON u.UserId = m.UserId
       LEFT JOIN MembershipRoles mr ON mr.MembershipId = m.MembershipId
       LEFT JOIN Roles r ON r.RoleId = mr.RoleId
       WHERE m.OrganizationId = ?
       GROUP BY m.MembershipId`
    )
    .all(organizationId);
}

export function updateStatus(membershipId, status) {
  getDb()
    .prepare("UPDATE Memberships SET Status = ? WHERE MembershipId = ?")
    .run(status, membershipId);
}
