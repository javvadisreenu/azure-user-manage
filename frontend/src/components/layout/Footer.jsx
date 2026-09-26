import { useSession } from "@/context/SessionContext";
import { Badge } from "@/components/ui/badge";

export function Footer() {
  const { tenantName, orgCode, roles } = useSession() ?? {};
  return (
    <footer className="bg-background/80 border-t px-4 py-3.5 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <p>
          <span className="font-medium text-foreground">SaaS Console</span> — multi-tenant
          identity &amp; access platform
        </p>
        <div className="flex items-center gap-2">
          {tenantName && (
            <Badge variant="outline" className="font-normal">
              {orgCode ? `${tenantName} · ${orgCode}` : tenantName}
            </Badge>
          )}
          {roles?.includes("PlatformAdmin") && <Badge variant="danger">PlatformAdmin</Badge>}
          <span className="tabular-nums">v1.0</span>
        </div>
      </div>
    </footer>
  );
}
