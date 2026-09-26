# Azure SQL Migration Guide

This app ships with SQLite (`better-sqlite3`) for zero-config local development. Follow this guide to replace it with **Azure SQL Database** for production.

---

## 1. Provision an Azure SQL Database

1. Open the [Azure portal](https://portal.azure.com) → **SQL databases** → **Create**.
2. Choose a resource group and server (create a new logical server if needed).
3. Pick **General Purpose – Serverless** for a cost-efficient start.
4. Set **Backup storage redundancy** to locally redundant for dev/test.
5. Under **Networking**, add your client IP and allow Azure services.
6. Note the **server name** (`<server>.database.windows.net`) and **database name**.

---

## 2. Install the `mssql` driver

```bash
cd backend
npm install mssql
npm install --save-dev @types/mssql
```

---

## 3. Create the schema

Run the equivalent of `schema.sql` against your Azure SQL database. Use Azure Data Studio or `sqlcmd`:

```sql
-- Organizations
CREATE TABLE Organizations (
  OrganizationId NVARCHAR(36) PRIMARY KEY,
  Code NVARCHAR(50) NOT NULL UNIQUE,
  Name NVARCHAR(200) NOT NULL,
  Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
  CreatedUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Users
CREATE TABLE Users (
  UserId NVARCHAR(36) PRIMARY KEY,
  PrimaryEmail NVARCHAR(320),
  DisplayName NVARCHAR(200),
  CreatedUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- UserIdentities
CREATE TABLE UserIdentities (
  UserIdentityId NVARCHAR(36) PRIMARY KEY,
  UserId NVARCHAR(36) NOT NULL REFERENCES Users(UserId),
  Issuer NVARCHAR(500) NOT NULL,
  Subject NVARCHAR(500) NOT NULL,
  EntraObjectId NVARCHAR(36),
  Provider NVARCHAR(50),
  CONSTRAINT UQ_UserIdentity UNIQUE (Issuer, Subject)
);

-- Roles
CREATE TABLE Roles (
  RoleId NVARCHAR(36) PRIMARY KEY,
  RoleCode NVARCHAR(50) NOT NULL UNIQUE
);

-- Memberships
CREATE TABLE Memberships (
  MembershipId NVARCHAR(36) PRIMARY KEY,
  OrganizationId NVARCHAR(36) NOT NULL REFERENCES Organizations(OrganizationId),
  UserId NVARCHAR(36) NOT NULL REFERENCES Users(UserId),
  Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
  CreatedUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- MembershipRoles
CREATE TABLE MembershipRoles (
  MembershipRoleId NVARCHAR(36) PRIMARY KEY,
  MembershipId NVARCHAR(36) NOT NULL REFERENCES Memberships(MembershipId),
  RoleId NVARCHAR(36) NOT NULL REFERENCES Roles(RoleId),
  CONSTRAINT UQ_MembershipRole UNIQUE (MembershipId, RoleId)
);

-- Invitations
CREATE TABLE Invitations (
  InvitationId NVARCHAR(36) PRIMARY KEY,
  OrganizationId NVARCHAR(36) NOT NULL REFERENCES Organizations(OrganizationId),
  Email NVARCHAR(320) NOT NULL,
  RoleCode NVARCHAR(50) NOT NULL,
  TokenHash NVARCHAR(64) NOT NULL UNIQUE,
  ExpiryUtc DATETIME2 NOT NULL,
  UsedUtc DATETIME2,
  CreatedByUserId NVARCHAR(36),
  Status NVARCHAR(20) NOT NULL DEFAULT 'Pending',
  CreatedUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- AuditEvents
CREATE TABLE AuditEvents (
  AuditEventId NVARCHAR(36) PRIMARY KEY,
  OrganizationId NVARCHAR(36),
  ActorUserId NVARCHAR(36),
  EventType NVARCHAR(100) NOT NULL,
  ResourceType NVARCHAR(100),
  ResourceId NVARCHAR(200),
  Details NVARCHAR(MAX),
  CreatedUtc DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Seed roles
INSERT INTO Roles (RoleId, RoleCode) VALUES
  (NEWID(), 'PlatformAdmin'),
  (NEWID(), 'TenantAdmin'),
  (NEWID(), 'Manager'),
  (NEWID(), 'User'),
  (NEWID(), 'ReadOnly');
```

---

## 4. Replace the database client

Replace `backend/src/db/client.ts` with an `mssql` implementation.

```typescript
// backend/src/db/client.ts  (Azure SQL version)
import sql from "mssql";

const pool = new sql.ConnectionPool({
  server: process.env.AZURE_SQL_SERVER!,          // e.g. myserver.database.windows.net
  database: process.env.AZURE_SQL_DATABASE!,
  authentication: {
    type: "azure-active-directory-default",        // uses Managed Identity when deployed
  },
  options: { encrypt: true, trustServerCertificate: false },
});

let _connected = false;
async function getPool() {
  if (!_connected) { await pool.connect(); _connected = true; }
  return pool;
}

export async function queryOne<T>(sql: string, ...params: unknown[]): Promise<T | undefined> {
  const p = await getPool();
  const req = p.request();
  params.forEach((v, i) => req.input(`p${i}`, v));
  const result = await req.query(sql.replace(/\?/g, (_, i) => `@p${i}`));
  return result.recordset[0] as T | undefined;
}

// queryAll, execute follow the same pattern...
```

> **Note:** The repositories use `?` placeholders (SQLite style). You'll need to convert them to named `@param` style for `mssql`, or use a thin adapter layer.

---

## 5. Set environment variables

Add to your `.env` or Azure App Service Configuration:

```
AZURE_SQL_SERVER=<server>.database.windows.net
AZURE_SQL_DATABASE=<database-name>
# For local dev with SQL auth (not recommended for production):
AZURE_SQL_USER=<username>
AZURE_SQL_PASSWORD=<password>
```

For production on Azure App Service / Container Apps, enable **System-assigned Managed Identity** and grant it `db_datareader` + `db_datawriter` on the database — no password needed.

---

## 6. Use Managed Identity in production

```sql
-- Run in the database as an admin
CREATE USER [<app-service-name>] FROM EXTERNAL PROVIDER;
ALTER ROLE db_datareader ADD MEMBER [<app-service-name>];
ALTER ROLE db_datawriter ADD MEMBER [<app-service-name>];
```

Set `authentication.type = "azure-active-directory-default"` in the connection config — the DefaultAzureCredential chain picks up the Managed Identity automatically.

---

## 7. Connection strings (alternative)

If you prefer a classic connection string instead of `mssql` config objects:

```
AZURE_SQL_CONNECTION_STRING=Server=tcp:<server>.database.windows.net,1433;Initial Catalog=<db>;Authentication=Active Directory Default;Encrypt=True;
```

---

## Summary checklist

- [ ] Azure SQL database provisioned
- [ ] Schema created and roles seeded
- [ ] `mssql` package installed
- [ ] `db/client.ts` replaced with Azure SQL implementation
- [ ] Repositories updated for `@param` placeholders
- [ ] Environment variables set
- [ ] Managed Identity configured (production)
- [ ] SQLite dependency removed from `package.json`
