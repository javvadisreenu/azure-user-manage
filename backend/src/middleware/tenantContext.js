import * as userIdentityRepo from "../repositories/userIdentityRepository.js";
import * as membershipRepo from "../repositories/membershipRepository.js";

export async function tenantContext(req, res, next) {
  const { issuer, subject } = req.identity;

  const identity = userIdentityRepo.findByIssuerAndSubject(issuer, subject);
  if (!identity) {
    return res.status(403).json({ error: "membership_required", detail: "No user identity found. Accept an invitation to join an organization." });
  }

  const memberships = membershipRepo.findActiveByUserId(identity.UserId);
  if (memberships.length === 0) {
    return res.status(403).json({ error: "no_active_membership" });
  }

  if (memberships.length > 1) {
    // Client must send X-Organization-Id header to select one
    const requestedOrgId = req.headers["x-organization-id"];
    if (!requestedOrgId) {
      return res.status(409).json({
        error: "tenant_selection_required",
        organizations: memberships.map((m) => ({
          organizationId: m.OrganizationId,
          name: m.OrganizationName,
          code: m.OrganizationCode,
        })),
      });
    }
    const selected = memberships.find((m) => m.OrganizationId === requestedOrgId);
    if (!selected) {
      return res.status(403).json({ error: "organization_not_accessible" });
    }
    req.tenant = buildTenantContext(identity, selected);
  } else {
    req.tenant = buildTenantContext(identity, memberships[0]);
  }

  next();
}

function buildTenantContext(identity, membership) {
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

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const hasRole = allowedRoles.some(
      (r) => req.tenant.roles.includes(r) || req.tenant.roles.includes("PlatformAdmin")
    );
    if (!hasRole) {
      return res.status(403).json({ error: "insufficient_role" });
    }
    next();
  };
}
