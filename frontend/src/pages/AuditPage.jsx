import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { eventBadgeVariant } from "@/lib/roles";
import { ScrollText, ShieldAlert } from "lucide-react";

export default function AuditPage({ activeOrgId }) {
  const { get, loading, error } = useApi(activeOrgId);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    get(`/api/organizations/${activeOrgId}/audit`).then(setEvents).catch(() => {});
  }, [activeOrgId]);

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Security and administrative event trail for this organization"
      />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="gap-0 py-0">
        {loading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
            <ScrollText className="size-8 opacity-40" />
            <p className="text-sm font-medium">No events recorded yet</p>
            <p className="text-xs">Administrative actions will show up here automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Event</th>
                  <th className="px-4 py-3 text-left font-medium">Resource</th>
                  <th className="px-4 py-3 text-left font-medium">Actor</th>
                  <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.AuditEventId} className="hover:bg-muted/50 border-b transition-colors last:border-0">
                    <td className="text-muted-foreground px-4 py-3 text-xs whitespace-nowrap tabular-nums">
                      {new Date(ev.CreatedUtc).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={eventBadgeVariant(ev.EventType)}>{ev.EventType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium">{ev.ResourceType}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">{ev.ResourceId}</p>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 font-mono text-xs">
                      {ev.ActorUserId ? ev.ActorUserId.slice(0, 8) + "…" : "system"}
                    </td>
                    <td className="hidden max-w-72 truncate px-4 py-3 text-xs lg:table-cell" title={ev.Details}>
                      {ev.Details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
