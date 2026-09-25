# Multi-Tenant SaaS SSO — Microsoft Entra External ID

React 18 + Node.js/Express multi-tenant SaaS starter with Microsoft Entra External ID authentication.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, MSAL React |
| Backend | Node.js 20, Express 4 |
| Auth | Microsoft Entra External ID (OIDC / OAuth 2.0 PKCE) |
| Database | SQLite (dev) / Azure SQL (prod) |

## Project structure

```
saas-sso/
  frontend/   React SPA (MSAL, React Router)
  backend/    Express REST API (JWT validation, tenant context)
  database/   schema.sql
```

## Quick start

### 1. Create Microsoft Entra External ID resources

Follow the guide sections 5–8:
- Create an External ID tenant
- Register the React SPA (public client, SPA platform, `http://localhost:3000` redirect)
- Register the Node.js API (expose scope `SaaS.Access`)
- Grant the SPA delegated permission to the API scope
- Create a Sign-up and sign-in user flow and associate both apps

### 2. Configure environment variables

**frontend/.env.development**
```
VITE_ENTRA_CLIENT_ID=<react-spa-client-id>
VITE_ENTRA_TENANT_SUBDOMAIN=<tenant-subdomain>
VITE_API_SCOPE=api://<node-api-client-id>/SaaS.Access
VITE_API_BASE_URL=http://localhost:4000
```

**backend/.env.development**
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:3000
ENTRA_TENANT_SUBDOMAIN=<tenant-subdomain>
ENTRA_TENANT_ID=<tenant-id>
ENTRA_API_CLIENT_ID=<node-api-client-id>
ENTRA_EXPECTED_SCOPE=SaaS.Access
DB_PATH=./saas.db
```

### 3. Install and run

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### 4. Bootstrap first organization

Use the SQLite CLI or a script to insert an Organization record and create a TenantAdmin invitation via the API after signing in with a PlatformAdmin identity:

```sql
INSERT INTO Organizations VALUES ('org-1', 'acme', 'Acme Corp', 'Active', datetime('now'));
```

Then `POST /api/invitations` from a PlatformAdmin session to invite the first TenantAdmin.

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | public | Health check |
| GET | /api/tenant-selector | token | List accessible orgs |
| POST | /api/invitations/accept | token | Accept invitation token |
| GET | /api/me | token + tenant | Current user + tenant |
| GET | /api/organizations | token + PlatformAdmin | List all orgs |
| POST | /api/organizations | token + PlatformAdmin | Create org |
| GET | /api/organizations/:id | token + member | Get org |
| GET | /api/organizations/:id/members | token + TenantAdmin | List members |
| PATCH | /api/organizations/:id/members/:mid | token + TenantAdmin | Update membership |
| GET | /api/organizations/:id/audit | token + TenantAdmin | Audit log |
| GET | /api/invitations | token + TenantAdmin | List pending invites |
| POST | /api/invitations | token + TenantAdmin | Create invitation |
| DELETE | /api/invitations/:id | token + TenantAdmin | Revoke invitation |

## Security notes

- Tokens are validated by the backend using `jose` (JWKS from Entra External ID).
- Tenant context is resolved from `issuer + subject` claims — never from email alone.
- Every data operation is scoped to `organizationId` from the resolved server-side context.
- Invitation tokens are stored as SHA-256 hashes; the raw token is only returned once.
- The React SPA is a public client — no client secret in the browser bundle.
