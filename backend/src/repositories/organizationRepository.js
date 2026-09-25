import { getDb } from "../data/db.js";

export function findById(organizationId) {
  return getDb()
    .prepare("SELECT * FROM Organizations WHERE OrganizationId = ?")
    .get(organizationId);
}

export function list() {
  return getDb().prepare("SELECT * FROM Organizations ORDER BY Name").all();
}

export function create({ organizationId, code, name, status }) {
  getDb()
    .prepare(
      "INSERT INTO Organizations (OrganizationId, Code, Name, Status) VALUES (?, ?, ?, ?)"
    )
    .run(organizationId, code, name, status);
}

export function updateStatus(organizationId, status) {
  getDb()
    .prepare("UPDATE Organizations SET Status = ? WHERE OrganizationId = ?")
    .run(status, organizationId);
}
