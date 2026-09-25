// Load env vars BEFORE any module that reads process.env at import time.
// ES module imports are hoisted, so dotenv.config() inline here would run
// AFTER authenticate.js has already read process.env. Importing env.js as
// the first import guarantees it runs first.
import "./env.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { runMigrations } from "./data/db.js";
import { authenticate } from "./middleware/authenticate.js";
import { tenantContext } from "./middleware/tenantContext.js";

import meRouter from "./routes/me.js";
import organizationsRouter from "./routes/organizations.js";
import invitationsRouter from "./routes/invitations.js";
import tenantSelectorRouter from "./routes/tenantSelector.js";

runMigrations();

const app = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
    credentials: false,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 60_000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Public endpoints
app.get("/health", (_, res) => res.json({ status: "ok" }));
app.use("/api/tenant-selector", tenantSelectorRouter);
app.use("/api/invitations/accept", invitationsRouter);

// Protected endpoints — require valid Entra access token + resolved tenant
app.use("/api", authenticate, tenantContext);
app.use("/api/me", meRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/invitations", invitationsRouter);

// Catch-all 404
app.use((_, res) => res.status(404).json({ error: "not_found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API listening on port ${port}`));
