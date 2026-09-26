# SaaS SSO — Complete Setup & Help Guide

Complete walkthrough for setting up Microsoft Entra External ID with this multi-tenant SaaS application. Covers tenant creation, app registrations, permissions, local development, and common errors.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Architecture](#2-architecture)
3. [Create an External ID tenant](#3-create-an-external-id-tenant)
4. [Switch to the External ID tenant](#4-switch-to-the-external-id-tenant)
5. [Create the API app registration](#5-create-the-api-app-registration)
6. [Expose the API scope](#6-expose-the-api-scope)
7. [Create the SPA app registration](#7-create-the-spa-app-registration)
8. [Add API permission to the SPA](#8-add-api-permission-to-the-spa)
9. [Grant admin consent](#9-grant-admin-consent)
10. [Create a user flow](#10-create-a-user-flow)
11. [Configure .env.development](#11-configure-envdevelopment)
12. [Create a test user](#12-create-a-test-user)
13. [Run the app](#13-run-the-app)
14. [Bootstrap first organization](#14-bootstrap-first-organization)
15. [Project structure](#15-project-structure)
16. [API endpoints](#16-api-endpoints)
17. [Database schema](#17-database-schema)
18. [Troubleshooting](#18-troubleshooting)
19. [Security notes](#19-security-notes)

---

## 1. Prerequisites

- **Node.js 20+** and npm
- An **Azure account** (free tier works)
- A browser (Chrome, Edge, Firefox)

---

## 2. Architecture

This app uses **two separate Entra app registrations**:

```
┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
│   React SPA (3001)   │───────▶│   Entra External ID  │───────▶│  Express API (4000)  │
│   Public client      │  login │   fpass.ciamlogin.com │  token │  JWT validation      │
│   MSAL + React       │◀───────│   OAuth 2.0 / OIDC   │        │  Tenant context      │
└──────────────────────┘redirect└──────────────────────┘        └──────────────────────┘
```

**Why two registrations?**

| | SPA Registration | API Registration |
|---|---|---|
| **Role** | Public client (browser) | Protected resource (server) |
| **Platform** | Single-page application | None (API only) |
| **Client secret** | None — browser apps can't keep secrets | None — validates tokens via public JWKS |
| **Redirect URI** | `http://localhost:3001/` | None |
| **Exposes scope** | No | Yes — `SaaS.Access` |
| **Env variable** | `VITE_ENTRA_CLIENT_ID` | `ENTRA_API_CLIENT_ID` |

**Flow:**
1. React SPA signs the user in via MSAL and requests an access token **for** the API's scope (`SaaS.Access`)
2. Express API receives the token, validates the `aud` (audience) and `scp` (scope) claims
3. If valid, the API resolves the SaaS tenant from `issuer + subject` and serves the request

---

## 3. Create an External ID tenant

> Skip this if you already have an External ID tenant.

1. Go to [entra.microsoft.com](https://entra.microsoft.com)
2. Click your profile icon → **Manage tenants** → **+ Create**
3. Select tenant type: **Customer** (External ID for customers / CIAM)
4. Fill in:
   - **Tenant name** — e.g. `Firstpass Tenant`
   - **Domain name** — e.g. `fpass` (becomes `fpass.onmicrosoft.com`)
   - **Country/Region** — choose carefully, cannot be changed later
5. Click **Review + Create** → **Create**
6. Wait for provisioning (1–3 minutes)

**Save these values from the Overview page:**

| Value | Where to find it | Env variable |
|---|---|---|
| Tenant subdomain | The part before `.onmicrosoft.com` (e.g. `fpass`) | `ENTRA_TENANT_SUBDOMAIN` |
| Tenant ID | Overview → Directory (tenant) ID (a GUID) | `ENTRA_TENANT_ID` |

---

## 4. Switch to the External ID tenant

You must be **inside** the External ID tenant to create app registrations.

1. In [entra.microsoft.com](https://entra.microsoft.com), click your **profile icon** (top right)
2. Click **Switch tenant** (or **Switch directory**)
3. Select your External ID tenant
4. Verify: the top bar shows your tenant name; Overview page shows **Tenant type: External**

> ⚠️ Every step from here on must be done **inside** the External ID tenant. If you see "Accounts in this organizational directory only" written out instead of "Single tenant only - [Tenant Name]", you may be in a regular Entra ID tenant.

---

## 5. Create the API app registration

This represents the Express backend — the protected resource.

**Portal path:** Entra ID → App registrations → **+ New registration**

1. Fill in:
   - **Name:** `SaaS API`
   - **Supported account types:** Single tenant only (shows as "Single tenant only - [Your Tenant]" in External ID tenants)
   - **Redirect URI:** Leave blank — APIs don't receive redirects
2. Click **Register**
3. On the **Overview** page, copy the **Application (client) ID**

> 📋 Save this: **Application (client) ID** → becomes `ENTRA_API_CLIENT_ID`

---

## 6. Expose the API scope

This makes the API discoverable so the SPA can request tokens for it.

**Portal path:** App registrations → SaaS API → **Expose an API**

1. Click **Add** next to **Application ID URI**
2. Accept the default: `api://<your-api-client-id>` → click **Save**
3. Click **+ Add a scope**:
   - **Scope name:** `SaaS.Access`
   - **Who can consent?** Admins and users
   - **Admin consent display name:** `Access SaaS API`
   - **Admin consent description:** `Allows the app to access the SaaS API on your behalf`
   - **State:** Enabled
4. Click **Add scope**

After saving, you'll see the full scope URI: `api://<api-client-id>/SaaS.Access`

> ⚠️ If you skip this step, the SPA app won't show under "My APIs" when adding permissions, and login will fail with error `AADSTS500011 — invalid_resource`.

---

## 7. Create the SPA app registration

This represents the React frontend — the public client that signs users in.

**Portal path:** Entra ID → App registrations → **+ New registration**

1. Fill in:
   - **Name:** `SaaS React SPA`
   - **Supported account types:** Single tenant only
   - **Redirect URI:**
     - Platform: **Single-page application (SPA)** ← not "Web"!
     - URI: `http://localhost:3001/` ← **include the trailing slash!**
2. Click **Register**
3. Copy the **Application (client) ID** from Overview

> 📋 Save this: **Application (client) ID** → becomes `VITE_ENTRA_CLIENT_ID`

> ⚠️ **Trailing slash matters.** MSAL appends `/` to `window.location.origin` when building the redirect URI. If the registration says `http://localhost:3001` (no slash) but MSAL sends `http://localhost:3001/`, Entra returns `AADSTS50011 — redirect URI mismatch`.

---

## 8. Add API permission to the SPA

This tells Entra the SPA is allowed to request tokens for the API.

**Portal path:** App registrations → SaaS React SPA → **API permissions**

1. Click **+ Add a permission**
2. Click the **My APIs** tab
3. Select **SaaS API**
4. Under **Delegated permissions**, check **SaaS.Access**
5. Click **Add permissions**

> ℹ️ **"My APIs" shows "No results"?** The API app must have at least one scope exposed under "Expose an API" (step 6). Go back and add the scope first.

---

## 9. Grant admin consent

External ID tenants often require admin consent. Grant it now.

**Portal path:** App registrations → SaaS React SPA → **API permissions**

1. You should see `SaaS.Access` listed under Configured permissions
2. Click **Grant admin consent for [Your Tenant]**
3. Confirm **Yes**
4. The Status column should show a ✅ green checkmark: "Granted for [Your Tenant]"

---

## 10. Create a user flow

A user flow defines how users sign in and sign up.

**Portal path:** Entra ID → External Identities → User flows → **+ New user flow**

1. Click **New user flow** → choose **Sign up and sign in**
2. Choose a sign-in method:
   - **Email + password** (simplest for dev)
   - Or **Email one-time passcode**
3. Select attributes to collect: `Display Name`, `Given Name`, `Surname`
4. Click **Create**
5. Open the new flow → **Applications** → **Add application** → add **both** the SPA and API registrations

> No `.env` values come from this step, but the flow must exist before login works.

---

## 11. Configure .env.development

All config lives in a single `.env.development` file **at the repo root** (not inside `frontend/` or `backend/`). Both apps read from this file.

```env
# ── BACKEND ──────────────────────────────────────────────────
PORT=4000
FRONTEND_ORIGIN=http://localhost:3001
ENTRA_TENANT_SUBDOMAIN=fpass
ENTRA_TENANT_ID=<your-tenant-id-guid>
ENTRA_API_CLIENT_ID=<API app's Application (client) ID>
ENTRA_EXPECTED_SCOPE=SaaS.Access
DB_PATH=./saas.db

# ── FRONTEND (VITE_ prefix required) ────────────────────────
VITE_ENTRA_CLIENT_ID=<SPA app's Application (client) ID>
VITE_ENTRA_TENANT_SUBDOMAIN=fpass
VITE_API_SCOPE=api://<API client ID>/SaaS.Access
VITE_API_BASE_URL=http://localhost:4000
```

**Quick reference — where each value comes from:**

| Variable | Portal location |
|---|---|
| `ENTRA_TENANT_SUBDOMAIN` | Overview → Primary domain (part before `.onmicrosoft.com`) |
| `ENTRA_TENANT_ID` | Overview → Directory (tenant) ID |
| `ENTRA_API_CLIENT_ID` | App registrations → SaaS API → Overview → Application (client) ID |
| `VITE_ENTRA_CLIENT_ID` | App registrations → SaaS React SPA → Overview → Application (client) ID |
| `VITE_API_SCOPE` | Build as: `api://` + `ENTRA_API_CLIENT_ID` + `/SaaS.Access` |

> ⚠️ `ENTRA_API_CLIENT_ID` and `VITE_ENTRA_CLIENT_ID` are **different** GUIDs from **different** app registrations. Using the same ID for both is the most common setup mistake.

---

## 12. Create a test user

**Portal path:** Entra ID → Users → **+ New user** → Create new user

1. **User principal name:** `testuser@fpass.onmicrosoft.com`
2. **Display name:** Anything
3. **Password:** Set a temporary password
4. Click **Create**

> ℹ️ On first sign-in, Entra forces the user to **change their password**. This is expected behavior. After changing it, login completes normally.

---

## 13. Run the app

### Start the backend

```bash
cd backend
npm install
npm run dev
```

Expected output:
```
Database migrations applied.
API listening on port 4000
```

### Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Opens at `http://localhost:3001` (port is pinned with `strictPort: true`).

### Sign in

1. Click **Sign in** on the landing page
2. You're redirected to `fpass.ciamlogin.com`
3. Enter your test user's email and password
4. If first login: change your password when prompted
5. Redirected back to the app → authenticated
6. Select or create an organization

---

## 14. Bootstrap first organization

> **Note:** Since auto-provisioning, the **first user to sign in** becomes PlatformAdmin automatically (when the platform has no PlatformAdmin yet). The manual SQLite step below is only needed if you want to grant PlatformAdmin to a *different* user.

After first sign-in, your identity exists in Entra but has no SaaS membership. Add one directly in SQLite:

```bash
cd backend
node -e "
const db = require('better-sqlite3')('./saas.db');
const { v4: uuid } = require('uuid');

// Replace <TENANT_ID> and <USER_SUB> with values from the backend console log
const issuer = 'https://<TENANT_ID>.ciamlogin.com/<TENANT_ID>/v2.0';
const subject = '<USER_SUB>';

const orgId = uuid();
const userId = uuid();

db.prepare(\"INSERT INTO Organizations VALUES (?,?,?,'Active',datetime('now'))\").run(orgId,'demo','Demo Org');
db.prepare(\"INSERT INTO Users VALUES (?,?,?,datetime('now'))\").run(userId,'you@example.com','Your Name');
db.prepare(\"INSERT INTO UserIdentities VALUES (?,?,?,?,NULL,NULL)\").run(uuid(),userId,issuer,subject);

const mid = uuid();
db.prepare(\"INSERT INTO Memberships VALUES (?,?,?,'Active',datetime('now'))\").run(mid,orgId,userId);

const roleId = db.prepare(\"SELECT RoleId FROM Roles WHERE RoleCode='PlatformAdmin'\").get().RoleId;
db.prepare(\"INSERT INTO MembershipRoles VALUES (?,?,?)\").run(uuid(),mid,roleId);
console.log('Done. Org:', orgId);
"
```

> **Important:** The issuer for Entra External ID uses the **tenant ID** as the subdomain, not the friendly tenant name. Format: `https://<tenantId>.ciamlogin.com/<tenantId>/v2.0`

---

## 15. Project structure

```
azure-user-manage/
├── .env.development          Shared config (backend + frontend)
├── help.md                   ← you are here
├── README.md                 Project overview
│
├── frontend/                 React SPA
│   ├── src/
│   │   ├── authConfig.js       MSAL config (authority, scopes)
│   │   ├── apiClient.js        Axios wrapper with token injection
│   │   ├── App.jsx             Routes and auth guard
│   │   ├── main.jsx            MSAL initialization
│   │   ├── components/
│   │   │   └── Nav.jsx         Navigation bar
│   │   └── pages/
│   │       ├── LandingPage.jsx     Sign in / Sign up
│   │       ├── OrgSelector.jsx     Organization picker
│   │       ├── Dashboard.jsx       Main dashboard
│   │       ├── MembersPage.jsx     Member management
│   │       ├── InvitationsPage.jsx Invite management
│   │       ├── AcceptInvitePage.jsx Invitation acceptance
│   │       └── AuditPage.jsx      Audit log viewer
│   └── vite.config.js         Vite config (port 3001, strictPort)
│
├── backend/                  Express API (TypeScript)
│   ├── src/
│   │   ├── server.ts            Entrypoint: env, migrations, listen
│   │   ├── app.ts               Express app factory (middleware + routes)
│   │   ├── config/
│   │   │   └── env.ts           dotenv loader (must be imported first)
│   │   ├── db/
│   │   │   ├── client.ts        better-sqlite3 connection + query helpers
│   │   │   └── migrate.ts       Schema migrations
│   │   ├── types.ts             Domain types + Express request augmentation
│   │   ├── middleware/
│   │   │   ├── authenticate.ts    JWT validation (jose + JWKS)
│   │   │   └── tenantContext.ts   Resolves SaaS tenant from token
│   │   ├── routes/
│   │   │   ├── me.ts              /api/me
│   │   │   ├── organizations.ts   /api/organizations
│   │   │   ├── invitations.ts     /api/invitations (create/list/revoke)
│   │   │   ├── invitationAccept.ts /api/invitations/accept (public)
│   │   │   ├── users.ts           /api/users
│   │   │   └── tenantSelector.ts  /api/tenant-selector (auto-provision)
│   │   ├── repositories/          SQLite data access
│   │   └── services/              Business logic
│   ├── tsconfig.json
│   └── saas.db                 SQLite database (auto-created)
│
└── database/
    └── schema.sql             Full schema + seed roles
```

---

## 16. API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Health check |
| `GET` | `/api/tenant-selector` | Token | List orgs the user belongs to |
| `POST` | `/api/invitations/accept` | Token | Accept an invitation token |
| `GET` | `/api/me` | Token + tenant | Current user info |
| `GET` | `/api/organizations` | Token + PlatformAdmin | List all orgs |
| `POST` | `/api/organizations` | Token + PlatformAdmin | Create an org |
| `GET` | `/api/organizations/:id` | Token + member | Get org details |
| `GET` | `/api/organizations/:id/members` | Token + TenantAdmin | List members |
| `PATCH` | `/api/organizations/:id/members/:mid` | Token + TenantAdmin | Update membership |
| `GET` | `/api/organizations/:id/audit` | Token + TenantAdmin | Audit log |
| `GET` | `/api/invitations` | Token + TenantAdmin | List pending invites |
| `POST` | `/api/invitations` | Token + TenantAdmin | Create invitation |
| `DELETE` | `/api/invitations/:id` | Token + TenantAdmin | Revoke invitation |

**Auth levels:**
- **Public** — no token required
- **Token** — valid Entra access token with `SaaS.Access` scope
- **Token + tenant** — token + resolved org membership (set via `X-Organization-Id` header)
- **Token + role** — token + tenant + specific role (PlatformAdmin, TenantAdmin, etc.)

---

## 17. Database schema

The app uses SQLite for development (auto-created at `backend/saas.db`). The full schema is in `database/schema.sql`.

**Core tables:**

| Table | Purpose |
|---|---|
| `Organizations` | SaaS tenants (id, code, name, status) |
| `Users` | User accounts (email, display name) |
| `UserIdentities` | Links users to Entra identities (issuer + subject) |
| `Memberships` | User-to-org associations (active/suspended/removed) |
| `Roles` | Role catalog (PlatformAdmin, TenantAdmin, Manager, User, ReadOnly) |
| `MembershipRoles` | Assigns roles to memberships |
| `Invitations` | Pending invitations (token hash, expiry, status) |
| `AuditEvents` | Event log per organization |
| `Subscriptions` | Plan/billing (placeholder for future use) |
| `OrganizationDomains` | Domain verification (placeholder for future use) |

---

## 18. Troubleshooting

### AADSTS500011 — invalid_resource

**Error:** `The resource principal named api://<id> was not found in the tenant`

**Cause:** The API app registration doesn't have its Application ID URI set or no scope is exposed.

**Fix:**
1. Open the API app → **Expose an API**
2. Set the **Application ID URI** to `api://<api-client-id>`
3. Add the `SaaS.Access` scope
4. Then add the API permission on the SPA app and grant admin consent

---

### AADSTS50011 — redirect URI mismatch

**Error:** `The redirect URI specified in the request does not match`

**Cause:** The redirect URI in the SPA registration doesn't match what MSAL sends.

**Fix:** The SPA registration must have `http://localhost:3001/` (with trailing `/`) as a **Single-page application** platform redirect URI. Not "Web", not "Mobile".

---

### 401 Unauthorized — invalid_token

**Error:** Backend returns `{"error": "invalid_token"}`

**Cause:** JWT verification fails — issuer or audience mismatch.

**Fix:** Entra External ID tokens use the **tenant ID** as the issuer subdomain:

```
✅ Correct issuer: https://<tenantId>.ciamlogin.com/<tenantId>/v2.0
❌ Wrong issuer:   https://fpass.ciamlogin.com/<tenantId>/v2.0
```

Verify by checking the OIDC discovery endpoint:
```bash
curl https://fpass.ciamlogin.com/<tenantId>/v2.0/.well-known/openid-configuration
```

The `issuer` field in the response is what your backend must match.

---

### 401 Unauthorized — missing_token

**Error:** Backend returns `{"error": "missing_token"}`

**Cause:** No `Authorization: Bearer ...` header sent with the request.

**Fix:** Ensure the frontend's `apiClient.js` calls `acquireTokenSilent` and attaches the access token. If the user isn't signed in, MSAL won't have a token.

---

### 403 — insufficient_scope

**Error:** Backend returns `{"error": "insufficient_scope"}`

**Cause:** The access token doesn't include the `SaaS.Access` scope.

**Fix:**
1. Ensure `VITE_API_SCOPE` matches: `api://<ENTRA_API_CLIENT_ID>/SaaS.Access`
2. Ensure the SPA has `SaaS.Access` permission added
3. Ensure admin consent is granted

---

### 403 — membership_required

**Error:** Backend returns `{"error": "membership_required"}` on `/api/tenant-selector`

**Cause:** The user's Entra identity (issuer + subject) has no matching record in the `UserIdentities` table.

**Fix:** This is the expected state for a brand-new user. Either:
- Bootstrap the first user manually (see [step 14](#14-bootstrap-first-organization))
- Or send them an invitation from an existing admin

---

### "My APIs" shows "No results"

**Cause:** The API app has no scopes exposed.

**Fix:** Go to the API app → **Expose an API** → add the Application ID URI and `SaaS.Access` scope (step 6).

---

### Vite starts on wrong port

**Cause:** Port 3001 is already in use and Vite falls back to another port.

**Fix:** `vite.config.js` is set to `port: 3001` with `strictPort: true`, so it will fail loudly instead of silently switching. Kill whatever is using port 3001 and restart:

```bash
# Windows — find what's using port 3001
netstat -ano | findstr :3001

# Kill it
taskkill /F /PID <pid>
```

---

### Password update required on first sign-in

**Not an error.** Entra forces new users to change their temporary password on first sign-in. After changing it, login completes normally.

---

### CORS errors from backend

**Error:** Browser console shows `CORS policy: No 'Access-Control-Allow-Origin'`

**Cause:** `FRONTEND_ORIGIN` in `.env.development` doesn't match the frontend's origin.

**Fix:** Set `FRONTEND_ORIGIN=http://localhost:3001` (no trailing slash). Restart the backend.

---

### Backend not reading .env.development

**Cause:** The backend loads `.env.development` from the repo root via `src/config/env.ts`, which must be the **first import** in `src/server.ts` (ES module imports are hoisted, so a later dotenv call would run after middleware already read `process.env`).

**Fix:** The loader walks up from its own directory until it finds `.env.development`, so it works both under `tsx` (src) and the compiled `dist/` output. Set `ENV_FILE` to override the file name.

---

## 19. Security notes

- **Token validation:** The backend validates JWTs using `jose` with JWKS fetched from Entra External ID. Tokens are verified for issuer, audience, and scope.
- **Tenant isolation:** Every data operation is scoped to an `OrganizationId` resolved server-side from the token's `issuer + subject` claims — never from the email alone.
- **PlatformAdmin is bootstrap-only:** The role is granted exactly once (to the first auto-provisioned user when no PlatformAdmin exists) and can never be granted from a tenant-scoped endpoint — invitations, member adds, and role edits all reject it.
- **No client secrets:** The React SPA is a public client. No client secret exists in the browser bundle. The backend doesn't need a secret either — it validates tokens using public signing keys.
- **Invitation security:** Invitation tokens are stored as SHA-256 hashes. The raw token is returned only once at creation time.
- **Rate limiting:** The Express API enforces 200 requests per minute per IP.
- **CORS:** Locked to the single frontend origin defined in `FRONTEND_ORIGIN`.
