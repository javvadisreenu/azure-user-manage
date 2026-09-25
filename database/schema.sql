-- Multi-tenant SaaS schema
-- Compatible with Azure SQL (UNIQUEIDENTIFIER) and SQLite (TEXT for GUIDs)

CREATE TABLE IF NOT EXISTS Organizations (
    OrganizationId TEXT NOT NULL PRIMARY KEY,
    Code TEXT NOT NULL UNIQUE,
    Name TEXT NOT NULL,
    Status TEXT NOT NULL CHECK (Status IN ('Active', 'Suspended', 'Archived')),
    CreatedUtc TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS OrganizationDomains (
    DomainId TEXT NOT NULL PRIMARY KEY,
    OrganizationId TEXT NOT NULL,
    Domain TEXT NOT NULL,
    VerificationStatus TEXT NOT NULL CHECK (VerificationStatus IN ('Pending', 'Verified', 'Failed')),
    UNIQUE (OrganizationId, Domain),
    FOREIGN KEY (OrganizationId) REFERENCES Organizations(OrganizationId)
);

CREATE TABLE IF NOT EXISTS Users (
    UserId TEXT NOT NULL PRIMARY KEY,
    PrimaryEmail TEXT,
    DisplayName TEXT,
    CreatedUtc TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS UserIdentities (
    UserIdentityId TEXT NOT NULL PRIMARY KEY,
    UserId TEXT NOT NULL,
    Issuer TEXT NOT NULL,
    Subject TEXT NOT NULL,
    EntraObjectId TEXT,
    Provider TEXT,
    UNIQUE (Issuer, Subject),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

CREATE TABLE IF NOT EXISTS Memberships (
    MembershipId TEXT NOT NULL PRIMARY KEY,
    OrganizationId TEXT NOT NULL,
    UserId TEXT NOT NULL,
    Status TEXT NOT NULL CHECK (Status IN ('Active', 'Suspended', 'Removed')),
    CreatedUtc TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (OrganizationId, UserId),
    FOREIGN KEY (OrganizationId) REFERENCES Organizations(OrganizationId),
    FOREIGN KEY (UserId) REFERENCES Users(UserId)
);

CREATE TABLE IF NOT EXISTS Roles (
    RoleId TEXT NOT NULL PRIMARY KEY,
    RoleCode TEXT NOT NULL UNIQUE,
    Description TEXT
);

CREATE TABLE IF NOT EXISTS MembershipRoles (
    MembershipRoleId TEXT NOT NULL PRIMARY KEY,
    MembershipId TEXT NOT NULL,
    RoleId TEXT NOT NULL,
    UNIQUE (MembershipId, RoleId),
    FOREIGN KEY (MembershipId) REFERENCES Memberships(MembershipId),
    FOREIGN KEY (RoleId) REFERENCES Roles(RoleId)
);

CREATE TABLE IF NOT EXISTS Invitations (
    InvitationId TEXT NOT NULL PRIMARY KEY,
    OrganizationId TEXT NOT NULL,
    Email TEXT NOT NULL,
    RoleCode TEXT NOT NULL,
    TokenHash TEXT NOT NULL UNIQUE,
    ExpiryUtc TEXT NOT NULL,
    UsedUtc TEXT,
    CreatedByUserId TEXT,
    Status TEXT NOT NULL CHECK (Status IN ('Pending', 'Accepted', 'Expired', 'Revoked')),
    CreatedUtc TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (OrganizationId) REFERENCES Organizations(OrganizationId)
);

CREATE TABLE IF NOT EXISTS Subscriptions (
    SubscriptionId TEXT NOT NULL PRIMARY KEY,
    OrganizationId TEXT NOT NULL,
    PlanCode TEXT NOT NULL,
    Status TEXT NOT NULL CHECK (Status IN ('Active', 'Trialing', 'Expired', 'Cancelled')),
    StartsUtc TEXT NOT NULL,
    EndsUtc TEXT,
    FOREIGN KEY (OrganizationId) REFERENCES Organizations(OrganizationId)
);

CREATE TABLE IF NOT EXISTS AuditEvents (
    AuditEventId TEXT NOT NULL PRIMARY KEY,
    OrganizationId TEXT,
    ActorUserId TEXT,
    EventType TEXT NOT NULL,
    ResourceType TEXT,
    ResourceId TEXT,
    Details TEXT,
    CreatedUtc TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed role catalog
INSERT OR IGNORE INTO Roles (RoleId, RoleCode, Description) VALUES
    ('role-platform-admin', 'PlatformAdmin', 'Full platform administration'),
    ('role-tenant-admin',   'TenantAdmin',   'Organization administration'),
    ('role-manager',        'Manager',        'Team and resource management'),
    ('role-user',           'User',           'Standard application access'),
    ('role-readonly',       'ReadOnly',       'View-only access');
