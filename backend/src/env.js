// This module must be imported FIRST — before any module that reads process.env.
// ES module imports are hoisted and run before top-level code in the importing file,
// so dotenv.config() in server.js runs AFTER authenticate.js reads process.env.
// By isolating dotenv in its own module that server.js imports first, we guarantee
// env vars are populated before any other module initializes.

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "../..", ".env.development");
const result = config({ path: envPath });

if (result.error) {
  console.error("[env] Failed to load .env.development:", result.error.message);
} else {
  console.log("[env] Loaded", envPath);
}
