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
azure-user-manage/
  frontend/   React SPA (MSAL, React Router)
  backend/    Express REST API (JWT validation, tenant context)
  database/   schema.sql
```

---

## Environment variable setup guide

Both `frontend/.env.development` and `backend/.env.development` need values from the
**Microsoft Entra admin center** (`https://entra.microsoft.com`). Follow these steps in order.

---

### Step 1 — Create a Microsoft Entra External ID tenant

> Portal path: **Entra ID → Overview → Manage tenants → Create → External**

1. Sign in to `https://entra.microsoft.com` with your Azure account.
2. Click **Manage tenants** → **Create** → choose **External**.
3. Fill in:
   - **Tenant name** — e.g. `My SaaS Customers`
   - **Domain name** — choose a unique subdomain, e.g. `mysaascustomers`  
     *(this becomes `mysaascustomers.onmicrosoft.com` and `mysaascustomers.ciamlogin.com`)*
   - **Country/Region** — choose carefully; cannot be changed later
4. Click **Review + Create**, then switch to the new tenant via **Directories + subscriptions**.

After creation, note these two values:

| Value | Where to find it | Used in |
|---|---|---|
| **Tenant subdomain** | The part before `.onmicrosoft.com` in the tenant domain | both `.env` files |
| **Directory (tenant) ID** | Entra ID → Overview → **Directory ID** field (a GUID) | `backend/.env.development` |

---

### Step 2 — Register the Node.js API app

> Portal path: **Entra ID → App registrations → New registration**

1. Click **New registration**.
2. **Name**: `SaaS API` (or any name you choose).
3. **Supported account types**: *Accounts in this organizational directory only*.
4. Leave redirect URI blank for an API. Click **Register**.
5. On the app's **Overview** page, copy the **Application (client) ID** — this is your `ENTRA_API_CLIENT_ID`.
6. Go to **Expose an API**:
   - Click **Add** next to *Application ID URI* — accept the default `api://<client-id>` and save.
   - Click **Add a scope**:
     - Scope name: `SaaS.Access`
     - Who can consent: `Admins and users`
     - Fill in display name and description, then click **Add scope**.

| Value | Where to find it | Used in |
|---|---|---|
| `ENTRA_API_CLIENT_ID` | App registrations → SaaS API → **Overview → Application (client) ID** | `backend/.env.development` |
| `VITE_API_SCOPE` | Combine: `api://<ENTRA_API_CLIENT_ID>/SaaS.Access` | `frontend/.env.development` |

---

### Step 3 — Register the React SPA app

> Portal path: **Entra ID → App registrations → New registration**

1. Click **New registration**.
2. **Name**: `SaaS React SPA`.
3. **Supported account types**: *Accounts in this organizational directory only*.
4. **Redirect URI**:
   - Platform: **Single-page application (SPA)**
   - URI: `http://localhost:3000`
5. Click **Register**.
6. On **Overview**, copy the **Application (client) ID** — this is your `VITE_ENTRA_CLIENT_ID`.
7. Go to **API permissions**:
   - Click **Add a permission → My APIs → SaaS API → Delegated → SaaS.Access → Add**.
   - Click **Grant admin consent** (if your tenant policy requires it).
8. Go to **Authentication**:
   - Confirm `http://localhost:3000` is listed under *Single-page application* redirect URIs.
   - Add `http://localhost:3000` as the **Front-channel logout URL**.
   - Ensure **Access tokens** and **ID tokens** checkboxes are both ticked under *Implicit grant* (usually auto-set for SPA).

| Value | Where to find it | Used in |
|---|---|---|
| `VITE_ENTRA_CLIENT_ID` | App registrations → SaaS React SPA → **Overview → Application (client) ID** | `frontend/.env.development` |

---

### Step 4 — Create a sign-up and sign-in user flow

> Portal path: **Entra ID → External Identities → User flows → New user flow**

1. Click **New user flow** → choose **Sign up and sign in**.
2. Choose a sign-in method (e.g. **Email one-time passcode** or **Email + password**).
3. Select attributes to collect: `Display Name`, `Given Name`, `Surname` (keep minimal).
4. Click **Create**.
5. Open the new flow → **Applications** → **Add application** → add **both** the SPA and the API registrations.

No `.env` values come from this step, but the flow must exist before login works.

---

### Step 5 — Fill in the `.env.development` files

#### `frontend/.env.development`

```env
# Application (client) ID of the React SPA registration (Step 3)
VITE_ENTRA_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# The subdomain part of your External ID tenant domain (Step 1)
# e.g. if your domain is mysaascustomers.onmicrosoft.com → use: mysaascustomers
VITE_ENTRA_TENANT_SUBDOMAIN=mysaascustomers

# Scope URI: api://<API client ID from Step 2>/SaaS.Access
VITE_API_SCOPE=api://xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx/SaaS.Access

# URL where the backend API listens locally — do not change for local dev
VITE_API_BASE_URL=http://localhost:4000
```

#### `backend/.env.development`

```env
# Port the Express API listens on
PORT=4000

# URL of the React frontend — used in CORS config
FRONTEND_ORIGIN=http://localhost:3000

# The subdomain part of your External ID tenant domain (Step 1)
ENTRA_TENANT_SUBDOMAIN=mysaascustomers

# Directory (tenant) ID — a GUID (Step 1)
# Find at: Entra ID → Overview → Directory ID
ENTRA_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Application (client) ID of the Node.js API registration (Step 2)
ENTRA_API_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# The scope name defined in Step 2 — do not change unless you renamed it
ENTRA_EXPECTED_SCOPE=SaaS.Access

# Path to the local SQLite database file (created automatically on first run)
DB_PATH=./saas.db
```

---

### Quick reference: where each value lives in the portal

| Variable | Portal location |
|---|---|
| `VITE_ENTRA_CLIENT_ID` | Entra ID → App registrations → **SaaS React SPA** → Overview → *Application (client) ID* |
| `VITE_ENTRA_TENANT_SUBDOMAIN` | Entra ID → Overview → *Primary domain* (part before `.onmicrosoft.com`) |
| `VITE_API_SCOPE` | Build as `api://` + API client ID + `/SaaS.Access` |
| `ENTRA_TENANT_SUBDOMAIN` | Same as `VITE_ENTRA_TENANT_SUBDOMAIN` |
| `ENTRA_TENANT_ID` | Entra ID → Overview → *Directory (tenant) ID* (GUID) |
| `ENTRA_API_CLIENT_ID` | Entra ID → App registrations → **SaaS API** → Overview → *Application (client) ID* |
| `ENTRA_EXPECTED_SCOPE` | Fixed value `SaaS.Access` — must match the scope name in Step 2 |

---

## Quick start

### Install and run

```bash
# Backend (terminal 1)
cd backend
npm install
npm run dev

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` — click **Sign in** to go through the Entra External ID user flow.

### Bootstrap first organization (one-time)

After the first sign-in, your identity exists in Entra but has no SaaS membership yet.
Insert a test organization directly in SQLite and add a PlatformAdmin role:

```bash
# From the backend/ directory, open the SQLite shell
npx -- node -e "
const db = require('better-sqlite3')('./saas.db');
const { v4: uuid } = require('uuid');
const orgId = uuid();
const userId = uuid();
// Replace the issuer and subject below with the iss/sub values logged in the backend console
const issuer = 'https://mysaascustomers.ciamlogin.com/<TENANT_ID>/v2.0';
const subject = '<your-sub-claim>';
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

> **Tip**: the backend logs `req.identity` on every authenticated request — copy the `issuer` and `subject` values from there.

---

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

---

## Security notes

- Tokens are validated by the backend using `jose` (JWKS fetched from Entra External ID).
- Tenant context is resolved from `issuer + subject` claims — never from email alone.
- Every data operation is scoped to `organizationId` from the resolved server-side context.
- Invitation tokens are stored as SHA-256 hashes; the raw token is only returned once.
- The React SPA is a public client — no client secret exists or is needed in the browser bundle.
