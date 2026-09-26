import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { NextFunction, Request, Response } from "express";
import type { AuthIdentity } from "../types.js";

// Accept either "fpass" or "fpass.onmicrosoft.com" — normalise to the bare subdomain
function stripTenantSuffix(value: string): string {
  return value
    .replace(/\.onmicrosoft\.com$/i, "")
    .replace(/\.ciamlogin\.com$/i, "")
    .trim();
}

const tenantSubdomain = stripTenantSuffix(process.env.ENTRA_TENANT_SUBDOMAIN || "");
const tenantId = process.env.ENTRA_TENANT_ID;
const apiClientId = process.env.ENTRA_API_CLIENT_ID;
const expectedScope = process.env.ENTRA_EXPECTED_SCOPE || "";

// Entra External ID (CIAM) uses the tenant ID as the issuer subdomain,
// not the friendly tenant name, so the issuer in every token is:
//   https://<tenantId>.ciamlogin.com/<tenantId>/v2.0
const issuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;

// JWKS endpoint uses the friendly subdomain and has no /v2.0 prefix
const jwksUri = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`;

// Fail fast on startup instead of producing nonsense issuer/JWKS URLs at runtime.
export function assertAuthConfig(): void {
  const missing = (
    [
      ["ENTRA_TENANT_SUBDOMAIN", tenantSubdomain],
      ["ENTRA_TENANT_ID", tenantId],
      ["ENTRA_API_CLIENT_ID", apiClientId],
      ["ENTRA_EXPECTED_SCOPE", expectedScope],
    ] as const
  )
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

// Lazily created so a missing JWKS URL doesn't break module import in tests
let _jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function getJwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(jwksUri));
  }
  return _jwks;
}

function stringClaim(payload: JWTPayload, key: string): string | null {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "missing_token" });
    return;
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: apiClientId,
    });

    const scopes = stringClaim(payload, "scp")?.split(" ") ?? [];
    if (!expectedScope || !scopes.includes(expectedScope)) {
      res.status(403).json({ error: "insufficient_scope" });
      return;
    }

    const identity: AuthIdentity = {
      issuer: payload.iss ?? issuer,
      subject: stringClaim(payload, "sub") ?? "",
      oid: stringClaim(payload, "oid"),
      email: stringClaim(payload, "email") ?? stringClaim(payload, "preferred_username"),
      name: stringClaim(payload, "name"),
    };

    if (!identity.subject) {
      res.status(401).json({ error: "invalid_token" });
      return;
    }

    req.identity = identity;
    next();
  } catch (err) {
    const code =
      (err as { code?: string }).code === "ERR_JWT_EXPIRED"
        ? "token_expired"
        : "invalid_token";
    res.status(401).json({ error: code });
  }
}
