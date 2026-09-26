import { v4 as uuidv4 } from "uuid";
import { execute, query, queryOne } from "../db/client.js";
import type { AuditEventRow } from "../types.js";

export function log(event: {
  organizationId: string | null;
  actorUserId: string | null;
  eventType: string;
  resourceType: string | null;
  resourceId: string | null;
  details: unknown;
}): void {
  execute(
    `INSERT INTO AuditEvents
       (AuditEventId, OrganizationId, ActorUserId, EventType, ResourceType, ResourceId, Details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    uuidv4(),
    event.organizationId,
    event.actorUserId,
    event.eventType,
    event.resourceType,
    event.resourceId,
    event.details ? JSON.stringify(event.details) : null
  );
}

export interface AuditFilter {
  eventType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export function listByOrganization(
  organizationId: string,
  filter: AuditFilter = {}
): { rows: AuditEventRow[]; total: number } {
  const { eventType, actorUserId, from, to, page = 1, limit = 25 } = filter;

  const conditions = ["OrganizationId = ?"];
  const params: unknown[] = [organizationId];

  if (eventType) { conditions.push("EventType = ?"); params.push(eventType); }
  if (actorUserId) { conditions.push("ActorUserId = ?"); params.push(actorUserId); }
  if (from) { conditions.push("CreatedUtc >= ?"); params.push(from); }
  if (to) { conditions.push("CreatedUtc <= ?"); params.push(to + "T23:59:59"); }

  const where = "WHERE " + conditions.join(" AND ");
  const total =
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM AuditEvents ${where}`, ...params)?.n ?? 0;
  const offset = (page - 1) * limit;
  const rows = query<AuditEventRow>(
    `SELECT * FROM AuditEvents ${where} ORDER BY CreatedUtc DESC LIMIT ? OFFSET ?`,
    ...params, limit, offset
  );

  return { rows, total };
}

export function distinctEventTypes(organizationId: string): string[] {
  return query<{ EventType: string }>(
    "SELECT DISTINCT EventType FROM AuditEvents WHERE OrganizationId = ? ORDER BY EventType",
    organizationId
  ).map((r) => r.EventType);
}

export function countRecentByOrganization(organizationId: string): number {
  return (
    queryOne<{ n: number }>(
      "SELECT COUNT(*) AS n FROM AuditEvents WHERE OrganizationId = ? AND CreatedUtc >= datetime('now', '-7 days')",
      organizationId
    )?.n ?? 0
  );
}
