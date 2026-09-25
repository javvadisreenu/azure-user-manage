import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || "./saas.db";

let _db;

export function getDb() {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

export function runMigrations() {
  const schemaPath = join(__dirname, "../../..", "database", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");
  const db = getDb();
  db.exec(schema);
  console.log("Database migrations applied.");
}
