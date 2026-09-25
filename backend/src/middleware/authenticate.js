import { createRemoteJWKSet, jwtVerify } from "jose";

// Accept either "fpass" or "fpass.onmicrosoft.com" — normalise to the bare subdomain
const rawSubdomain = process.env.ENTRA_TENANT_SUBDOMAIN || "";
const tenantSubdomain = rawSubdomain
  .replace(/\.onmicrosoft\.com$/i, "")
  .replace(/\.ciamlogin\.com$/i, "")
  .trim();

const tenantId = process.env.ENTRA_TENANT_ID;
const apiClientId = process.env.ENTRA_API_CLIENT_ID;
const expectedScope = process.env.ENTRA_EXPECTED_SCOPE;

// Entra External ID (CIAM) uses the tenant ID as the issuer subdomain,
// not the friendly tenant name, so the issuer in every token is:
//   https://<tenantId>.ciamlogin.com/<tenantId>/v2.0
const issuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;

// JWKS endpoint uses the friendly subdomain and has no /v2.0 prefix
const jwksUri = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/discovery/v2.0/keys`;

// Lazily created so env vars are read at request time in tests
let _jwks;
function getJwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(jwksUri));
  }
  return _jwks;
}

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer,
      audience: apiClientId,
    });

    const scopes = String(payload.scp || "").split(" ");
    if (!scopes.includes(expectedScope)) {
      return res.status(403).json({ error: "insufficient_scope" });
    }

    req.identity = {
      issuer: payload.iss,
      subject: payload.sub,
      oid: payload.oid ?? null,
      email: payload.email ?? payload.preferred_username ?? null,
      name: payload.name ?? null,
    };

    next();
  } catch (err) {
    const code = err.code === "ERR_JWT_EXPIRED" ? "token_expired" : "invalid_token";
    res.status(401).json({ error: code });
  }
}
