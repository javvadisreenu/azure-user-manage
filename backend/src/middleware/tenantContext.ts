import type { NextFunction, Request, Response } from "express";
import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";
import type { MembershipWithOrg, UserIdentityRow } from "../types.js";

export async function tenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { issuer, subject } = req.identity!; // guaranteed by authenticate()

  const identity = userIdentityRepo.findByIssuerAndSubject(issuer, subject);
  if (!identity) {
    res.status(403).json({
      error: "membership_required",
      detail: "No user identity found. Accept an invitation to join an organization.",
    });
    return;
  }

  const memberships = membershipRepo.findActiveByUserId(identity.UserId);
  if (memberships.length === 0) {
    res.status(403).json({ error: "no_active_membership" });
    return;
  }

  if (memberships.length > 1) {
    // Client must send X-Organization-Id header to select one
    const requestedOrgId = req.header("x-organization-id");
    if (!requestedOrgId) {
      res.status(409).json({
        error: "tenant_selection_required",
        organizations: memberships.map((m) => ({
          organizationId: m.OrganizationId,
          name: m.OrganizationName,
          code: m.OrganizationCode,
        })),
      });
      return;
    }
    const selected = memberships.find((m) => m.OrganizationId === requestedOrgId);
    if (!selected) {
      res.status(403).json({ error: "organization_not_accessible" });
      return;
    }
    req.tenant = buildTenantContext(identity, selected);
  } else {
    req.tenant = buildTenantContext(identity, memberships[0]);
  }

  next();
}

function buildTenantContext(identity: UserIdentityRow, membership: MembershipWithOrg) {
  const roles = membershipRepo.getRolesForMembership(membership.MembershipId);
  return {
    organizationId: membership.OrganizationId,
    organizationName: membership.OrganizationName,
    organizationCode: membership.OrganizationCode,
    userId: identity.UserId,
    membershipId: membership.MembershipId,
    roles,
  };
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const roles = req.tenant?.roles ?? [];
    // PlatformAdmin (assigned only via the first-login bootstrap) acts
    // platform-wide; every other role is scoped to the active organization.
    const hasRole =
      allowedRoles.some((r) => roles.includes(r)) || roles.includes("PlatformAdmin");
    if (!hasRole) {
      res.status(403).json({ error: "insufficient_role" });
      return;
    }
    next();
  };
}
