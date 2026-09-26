// Must be the first import: loads .env.development before any module reads
// process.env at import time (see src/config/env.ts).
import "./config/env.js";

import { runMigrations } from "./db/migrate.js";
import { assertAuthConfig } from "./middleware/authenticate.js";
import { createApp } from "./app.js";

runMigrations();
assertAuthConfig();

const app = createApp();
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on port ${port}`));
