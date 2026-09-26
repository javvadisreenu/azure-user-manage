import { Badge } from "@/components/ui/badge";

// Consistent semantic colors for role chips across the app.
export function roleBadgeVariant(role) {
  switch (role) {
    case "PlatformAdmin": return "danger";
    case "TenantAdmin": return "info";
    case "Manager": return "purple";
    case "ReadOnly": return "warning";
    case "User": return "success";
    default: return "secondary";
  }
}

export function RoleBadge({ role }) {
  return <Badge variant={roleBadgeVariant(role)}>{role}</Badge>;
}

// Status chips for memberships / orgs.
export function statusBadgeVariant(status) {
  switch (status) {
    case "Active": return "success";
    case "Suspended": return "warning";
    case "Trialing": return "info";
    case "Removed":
    case "Archived": return "destructive";
    case "Pending": return "warning";
    case "Accepted": return "success";
    case "Expired": return "secondary";
    case "Revoked": return "destructive";
    default: return "secondary";
  }
}

export function StatusBadge({ status }) {
  return <Badge variant={statusBadgeVariant(status)}>{status}</Badge>;
}

// Audit event chips — green for provisioning, blue for reads/updates,
// red for destructive changes.
export function eventBadgeVariant(eventType) {
  if (/Created|Provisioned|Added|Accepted/.test(eventType)) return "success";
  if (/Updated|Changed|Selected/.test(eventType)) return "info";
  if (/Revoked|Removed|Suspended|Archived|Failed/.test(eventType)) return "destructive";
  return "secondary";
}
