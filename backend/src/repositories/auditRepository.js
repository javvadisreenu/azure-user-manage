import { getDb } from "../data/db.js";
import { v4 as uuidv4 } from "uuid";

export function log({ organizationId, actorUserId, eventType, resourceType, resourceId, details }) {
  getDb()
    .prepare(
      `INSERT INTO AuditEvents
         (AuditEventId, OrganizationId, ActorUserId, EventType, ResourceType, ResourceId, Details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      uuidv4(),
      organizationId ?? null,
      actorUserId ?? null,
      eventType,
      resourceType ?? null,
      resourceId ?? null,
      details ? JSON.stringify(details) : null
    );
}

export function listByOrganization(organizationId, limit = 50) {
  return getDb()
    .prepare(
      "SELECT * FROM AuditEvents WHERE OrganizationId = ? ORDER BY CreatedUtc DESC LIMIT ?"
    )
    .all(organizationId, limit);
}
