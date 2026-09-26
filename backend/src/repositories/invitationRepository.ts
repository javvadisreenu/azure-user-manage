import { execute, query, queryOne } from "../db/client.js";
import type { Invitation } from "../types.js";

export function findById(invitationId: string): Invitation | undefined {
  return queryOne<Invitation>(
    "SELECT * FROM Invitations WHERE InvitationId = ?",
    invitationId
  );
}

export function findByTokenHash(tokenHash: string): Invitation | undefined {
  return queryOne<Invitation>(
    "SELECT * FROM Invitations WHERE TokenHash = ?",
    tokenHash
  );
}

export function findPendingByOrganization(organizationId: string): Invitation[] {
  return query<Invitation>(
    "SELECT * FROM Invitations WHERE OrganizationId = ? AND Status = 'Pending' ORDER BY CreatedUtc DESC",
    organizationId
  );
}

export function countPendingByOrganization(organizationId: string): number {
  return (
    queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM Invitations WHERE OrganizationId = ? AND Status = 'Pending' AND ExpiryUtc > datetime('now')",
      organizationId
    )?.n ?? 0
  );
}

export function create(inv: {
  invitationId: string;
  organizationId: string;
  email: string;
  roleCode: string;
  tokenHash: string;
  expiryUtc: string;
  createdByUserId: string | null;
}): void {
  execute(
    `INSERT INTO Invitations
       (InvitationId, OrganizationId, Email, RoleCode, TokenHash, ExpiryUtc, CreatedByUserId, Status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
    inv.invitationId,
    inv.organizationId,
    inv.email,
    inv.roleCode,
    inv.tokenHash,
    inv.expiryUtc,
    inv.createdByUserId
  );
}

export function markAccepted(invitationId: string): void {
  execute(
    "UPDATE Invitations SET Status = 'Accepted', UsedUtc = datetime('now') WHERE InvitationId = ?",
    invitationId
  );
}

export function revoke(invitationId: string): void {
  execute(
    "UPDATE Invitations SET Status = 'Revoked' WHERE InvitationId = ?",
    invitationId
  );
}

export function expireStale(): void {
  execute(
    "UPDATE Invitations SET Status = 'Expired' WHERE Status = 'Pending' AND ExpiryUtc < datetime('now')"
  );
}
