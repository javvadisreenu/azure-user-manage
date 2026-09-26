import { v4 as uuidv4 } from "uuid";
import { execute, query } from "../db/client.js";
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

export function listByOrganization(organizationId: string, limit = 50): AuditEventRow[] {
  return query<AuditEventRow>(
    "SELECT * FROM AuditEvents WHERE OrganizationId = ? ORDER BY CreatedUtc DESC LIMIT ?",
    organizationId,
    limit
  );
}
