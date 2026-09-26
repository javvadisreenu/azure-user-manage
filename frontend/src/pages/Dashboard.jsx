import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { roleBadgeVariant } from "@/lib/roles";
import {
  ArrowRight,
  Building2,
  MailPlus,
  ScrollText,
  ShieldAlert,
  UserRound,
  Users,
} from "lucide-react";

export default function Dashboard({ activeOrgId }) {
  const { get, loading, error } = useApi(activeOrgId);
  const [me, setMe] = useState(null);

  useEffect(() => {
    get("/api/me").then(setMe).catch(() => {});
  }, [activeOrgId]);

  if (loading && !me) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Loading…" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!me) return null;

  const isTenantAdmin =
    me.tenant.roles.includes("TenantAdmin") || me.tenant.roles.includes("PlatformAdmin");

  return (
    <div>
      <PageHeader
        title={`Welcome back${me.user.displayName ? `, ${me.user.displayName.split(" ")[0]}` : ""}`}
        description={`${me.tenant.organizationName} (${me.tenant.organizationCode})`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Signed in as */}
        <Card className="gap-4">
          <CardHeader className="flex-row items-center gap-3">
            <div className="bg-primary/8 text-primary ring-primary/15 flex size-9 items-center justify-center rounded-lg ring-1">
              <UserRound className="size-4.5" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Signed in as</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate font-semibold">{me.user.displayName || me.user.primaryEmail}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-sm">{me.user.primaryEmail}</p>
          </CardContent>
        </Card>

        {/* Roles */}
        <Card className="gap-4">
          <CardHeader className="flex-row items-center gap-3">
            <div className="bg-primary/8 text-primary ring-primary/15 flex size-9 items-center justify-center rounded-lg ring-1">
              <Users className="size-4.5" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Your roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {me.tenant.roles.length > 0 ? (
                me.tenant.roles.map((r) => (
                  <Badge key={r} variant={roleBadgeVariant(r)}>{r}</Badge>
                ))
              ) : (
                <Badge variant="warning">No roles</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organization */}
        <Card className="gap-4 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex-row items-center gap-3">
            <div className="bg-primary/8 text-primary ring-primary/15 flex size-9 items-center justify-center rounded-lg ring-1">
              <Building2 className="size-4.5" />
            </div>
            <CardTitle className="text-sm font-medium text-muted-foreground">Organization</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="truncate font-semibold">{me.tenant.organizationName}</p>
            <p className="text-muted-foreground mt-0.5 truncate font-mono text-xs">
              {me.tenant.organizationId}
            </p>
          </CardContent>
        </Card>
      </div>

      {isTenantAdmin && (
        <div className="mt-8">
          <h2 className="mb-4 text-sm font-semibold tracking-tight">Quick actions</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <QuickLink to="/members" icon={Users} title="Manage members" text="Roles, suspensions and membership status" />
            <QuickLink to="/invitations" icon={MailPlus} title="Invite users" text="Send expiring invitation links" />
            <QuickLink to="/audit" icon={ScrollText} title="Audit log" text="Review the security event trail" />
          </div>
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, title, text }) {
  return (
    <Link to={to}>
      <Card className="group hover:border-ring/60 h-full gap-3 py-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex items-start gap-3">
          <div className="bg-primary/8 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              {title}
              <ArrowRight className="text-muted-foreground size-3.5 transition-transform group-hover:translate-x-0.5" />
            </p>
            <p className="text-muted-foreground mt-0.5 text-[13px] leading-relaxed">{text}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
