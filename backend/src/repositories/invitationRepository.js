import { getDb } from "../data/db.js";

export function findByTokenHash(tokenHash) {
  return getDb()
    .prepare("SELECT * FROM Invitations WHERE TokenHash = ?")
    .get(tokenHash);
}

export function findPendingByOrganization(organizationId) {
  return getDb()
    .prepare(
      "SELECT * FROM Invitations WHERE OrganizationId = ? AND Status = 'Pending' ORDER BY CreatedUtc DESC"
    )
    .all(organizationId);
}

export function create({ invitationId, organizationId, email, roleCode, tokenHash, expiryUtc, createdByUserId }) {
  getDb()
    .prepare(
      `INSERT INTO Invitations
         (InvitationId, OrganizationId, Email, RoleCode, TokenHash, ExpiryUtc, CreatedByUserId, Status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`
    )
    .run(invitationId, organizationId, email, roleCode, tokenHash, expiryUtc, createdByUserId ?? null);
}

export function markAccepted(invitationId) {
  getDb()
    .prepare(
      "UPDATE Invitations SET Status = 'Accepted', UsedUtc = datetime('now') WHERE InvitationId = ?"
    )
    .run(invitationId);
}

export function revoke(invitationId) {
  getDb()
    .prepare("UPDATE Invitations SET Status = 'Revoked' WHERE InvitationId = ?")
    .run(invitationId);
}

export function expireStale() {
  getDb()
    .prepare(
      "UPDATE Invitations SET Status = 'Expired' WHERE Status = 'Pending' AND ExpiryUtc < datetime('now')"
    )
    .run();
}
