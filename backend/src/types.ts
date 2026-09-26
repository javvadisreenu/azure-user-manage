import type { Request } from "express";

// ---------------------------------------------------------------------------
// Domain row types (mirror database/schema.sql column names)
// ---------------------------------------------------------------------------

export type OrgStatus = "Active" | "Suspended" | "Archived";
export type MembershipStatus = "Active" | "Suspended" | "Removed";
export type InvitationStatus = "Pending" | "Accepted" | "Expired" | "Revoked";

export interface Organization {
  OrganizationId: string;
  Code: string;
  Name: string;
  Status: OrgStatus;
  CreatedUtc: string;
}

export interface User {
  UserId: string;
  PrimaryEmail: string | null;
  DisplayName: string | null;
  CreatedUtc: string;
}

export interface UserSearchRow extends User {
  OrgCount: number;
}

export interface UserIdentityRow {
  UserIdentityId: string;
  UserId: string;
  Issuer: string;
  Subject: string;
  EntraObjectId: string | null;
  Provider: string | null;
}

export interface Membership {
  MembershipId: string;
  OrganizationId: string;
  UserId: string;
  Status: MembershipStatus;
  CreatedUtc: string;
}

export interface MembershipWithOrg extends Membership {
  OrganizationName: string;
  OrganizationCode: string;
}

export interface MemberListRow {
  MembershipId: string;
  Status: MembershipStatus;
  CreatedUtc: string;
  UserId: string;
  DisplayName: string | null;
  PrimaryEmail: string | null;
  /** GROUP_CONCAT of role codes, e.g. "TenantAdmin,Manager" */
  Roles: string | null;
}

export interface Invitation {
  InvitationId: string;
  OrganizationId: string;
  Email: string;
  RoleCode: string;
  TokenHash: string;
  ExpiryUtc: string;
  UsedUtc: string | null;
  CreatedByUserId: string | null;
  Status: InvitationStatus;
  CreatedUtc: string;
}

export interface AuditEventRow {
  AuditEventId: string;
  OrganizationId: string | null;
  ActorUserId: string | null;
  EventType: string;
  ResourceType: string | null;
  ResourceId: string | null;
  Details: string | null;
  CreatedUtc: string;
}

// ---------------------------------------------------------------------------
// Request-scoped context
// ---------------------------------------------------------------------------

export interface AuthIdentity {
  issuer: string;
  subject: string;
  oid: string | null;
  email: string | null;
  name: string | null;
}

export interface TenantContext {
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  userId: string;
  membershipId: string;
  roles: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by authenticate() — present on any route behind it. */
      identity?: AuthIdentity;
      /** Set by tenantContext() — present on protected tenant-scoped routes. */
      tenant?: TenantContext;
    }
  }
}

// ---------------------------------------------------------------------------
// Role catalog
// ---------------------------------------------------------------------------

export const ALL_ROLES: readonly string[] = [
  "PlatformAdmin",
  "TenantAdmin",
  "Manager",
  "User",
  "ReadOnly",
];

// Roles a TenantAdmin may grant to members of their own organization.
// PlatformAdmin is deliberately excluded: it can only come from the
// first-login platform bootstrap, never from a tenant-scoped endpoint.
export const ASSIGNABLE_ROLES: readonly string[] = [
  "TenantAdmin",
  "Manager",
  "User",
  "ReadOnly",
];
