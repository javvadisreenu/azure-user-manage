import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { authenticate } from "./middleware/authenticate.js";
import { tenantContext } from "./middleware/tenantContext.js";

import meRouter from "./routes/me.js";
import organizationsRouter from "./routes/organizations.js";
import invitationsRouter from "./routes/invitations.js";
import invitationAcceptRouter from "./routes/invitationAccept.js";
import tenantSelectorRouter from "./routes/tenantSelector.js";
import usersRouter from "./routes/users.js";

export function createApp(): Express {
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

  // Public endpoints — mounted BEFORE the global auth gate.
  // tenant-selector and invitation-accept each run authenticate() internally
  // but must NOT run tenantContext(): first-time users have no membership yet.
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/tenant-selector", tenantSelectorRouter);
  // Only the accept action is exposed here — NOT the whole invitations router.
  app.use("/api/invitations/accept", invitationAcceptRouter);

  // Protected endpoints — require valid Entra access token + resolved tenant
  app.use("/api", authenticate, tenantContext);
  app.use("/api/me", meRouter);
  app.use("/api/organizations", organizationsRouter);
  app.use("/api/invitations", invitationsRouter);
  app.use("/api/users", usersRouter);

  // Catch-all 404
  app.use((_req, res) => res.status(404).json({ error: "not_found" }));

  // Error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}
