import { execute, query, queryOne } from "../db/client.js";
import type { Organization } from "../types.js";

export function findById(organizationId: string): Organization | undefined {
  return queryOne<Organization>(
    "SELECT * FROM Organizations WHERE OrganizationId = ?",
    organizationId
  );
}

export function findByCode(code: string): Organization | undefined {
  return queryOne<Organization>("SELECT * FROM Organizations WHERE Code = ?", code);
}

export function list(): Organization[] {
  return query<Organization>("SELECT * FROM Organizations ORDER BY Name");
}

export function create(org: {
  organizationId: string;
  code: string;
  name: string;
  status: string;
}): void {
  execute(
    "INSERT INTO Organizations (OrganizationId, Code, Name, Status) VALUES (?, ?, ?, ?)",
    org.organizationId,
    org.code,
    org.name,
    org.status
  );
}

export function updateStatus(organizationId: string, status: string): void {
  execute(
    "UPDATE Organizations SET Status = ? WHERE OrganizationId = ?",
    status,
    organizationId
  );
}

export function updateName(organizationId: string, name: string): void {
  execute(
    "UPDATE Organizations SET Name = ? WHERE OrganizationId = ?",
    name,
    organizationId
  );
}
