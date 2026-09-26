import Database from "better-sqlite3";

const dbPath = process.env.DB_PATH || "./saas.db";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

// Thin typed helpers over better-sqlite3 so repositories stay terse and the
// (any-typed) statement plumbing lives in exactly one place.

export function queryOne<T>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...(params as never[])) as T | undefined;
}

export function query<T>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...(params as never[])) as T[];
}

export function execute(sql: string, ...params: unknown[]): void {
  getDb().prepare(sql).run(...(params as never[]));
}

export function withTransaction<T>(fn: () => T): T {
  return getDb().transaction(fn)() as T;
}
