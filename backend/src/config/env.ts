// This module must be imported FIRST — before any module that reads process.env
// at import time (ES module imports are hoisted and evaluated in order, so
// importing it as the first statement of the entrypoint guarantees the env
// file is loaded before middleware/repositories initialize).
//
// The env file is located by walking up from this module's directory, which
// works identically whether running from src (tsx) or dist (compiled output).

import { config } from "dotenv";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const fileName = process.env.ENV_FILE || ".env.development";

let dir = here;
let envPath: string | null = null;
for (let i = 0; i < 8; i++) {
  const candidate = resolve(dir, fileName);
  if (existsSync(candidate)) {
    envPath = candidate;
    break;
  }
  const parent = dirname(dir);
  if (parent === dir) break;
  dir = parent;
}

const result = envPath
  ? config({ path: envPath })
  : { error: new Error(`${fileName} not found (searched upwards from ${here})`) };

if (result.error) {
  console.error(`[env] Failed to load ${fileName}:`, result.error.message);
} else {
  console.log("[env] Loaded", envPath);
}
