import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { getDb } from "./client.js";

const here = dirname(fileURLToPath(import.meta.url));

// Resolves correctly from both src (tsx) and dist (compiled): the compiled file
// sits at <root>/backend/dist/db/migrate.js and the schema at <root>/database/.
const schemaPath = join(here, "../../../database/schema.sql");

export function runMigrations(): void {
  const schema = readFileSync(schemaPath, "utf8");
  getDb().exec(schema);
  console.log("Database migrations applied.");
}

// Allow `npm run migrate` to execute this module directly.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  runMigrations();
}
