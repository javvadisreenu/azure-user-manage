import { createRemoteJWKSet, jwtVerify } from "jose";

const tenantSubdomain = process.env.ENTRA_TENANT_SUBDOMAIN;
const tenantId = process.env.ENTRA_TENANT_ID;
const apiClientId = process.env.ENTRA_API_CLIENT_ID;
const expectedScope = process.env.ENTRA_EXPECTED_SCOPE;

const authority = `https://${tenantSubdomain}.ciamlogin.com/${tenantId}/v2.0`;

// Lazily created so env vars are read at request time in tests
let _jwks;
function getJwks() {
  if (!_jwks) {
    _jwks = createRemoteJWKSet(new URL(`${authority}/discovery/v2.0/keys`));
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
      issuer: authority,
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
