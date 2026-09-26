import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { eventBadgeVariant } from "@/lib/roles";
import { Download, Filter, RotateCcw, ScrollText, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

function downloadCsv(events) {
  const header = ["Time", "Event", "Resource Type", "Resource ID", "Actor", "Details"];
  const rows = events.map((ev) => [
    new Date(ev.CreatedUtc).toISOString(),
    ev.EventType,
    ev.ResourceType ?? "",
    ev.ResourceId ?? "",
    ev.ActorUserId ?? "system",
    ev.Details ?? "",
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditPage({ activeOrgId }) {
  const { get, loading, error } = useApi(activeOrgId);
  const [data, setData] = useState({ events: [], total: 0, eventTypes: [] });
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ eventType: "", from: "", to: "" });
  const [applied, setApplied] = useState({ eventType: "", from: "", to: "" });

  const load = useCallback(
    (p = page, f = applied) => {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (f.eventType) params.set("eventType", f.eventType);
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);
      get(`/api/organizations/${activeOrgId}/audit?${params}`)
        .then((res) => setData(res))
        .catch(() => {});
    },
    [activeOrgId, get, page, applied]
  );

  useEffect(() => {
    load(1, applied);
    setPage(1);
  }, [activeOrgId, applied]);

  useEffect(() => {
    load(page, applied);
  }, [page]);

  function applyFilters() {
    setApplied({ ...filters });
  }

  function resetFilters() {
    const empty = { eventType: "", from: "", to: "" };
    setFilters(empty);
    setApplied(empty);
  }

  async function exportAll() {
    const params = new URLSearchParams({ page: "1", limit: "1000" });
    if (applied.eventType) params.set("eventType", applied.eventType);
    if (applied.from) params.set("from", applied.from);
    if (applied.to) params.set("to", applied.to);
    try {
      const res = await get(`/api/organizations/${activeOrgId}/audit?${params}`);
      downloadCsv(res.events);
      toast.success("Audit log exported");
    } catch {
      toast.error("Export failed");
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const hasFilters = applied.eventType || applied.from || applied.to;

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Security and administrative event trail for this organization"
      >
        <Button variant="outline" size="sm" onClick={exportAll} disabled={data.events.length === 0}>
          <Download className="size-4" />
          Export CSV
        </Button>
      </PageHeader>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-36 gap-1.5">
            <Label className="text-xs">Event type</Label>
            <Select
              value={filters.eventType}
              onValueChange={(v) => setFilters((f) => ({ ...f, eventType: v === "__all__" ? "" : v }))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All events</SelectItem>
                {data.eventTypes.map((et) => (
                  <SelectItem key={et} value={et}>{et}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="h-8 text-sm"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            />
          </div>
          <Button size="sm" className="h-8" onClick={applyFilters}>
            <Filter className="size-3.5" /> Apply
          </Button>
          {hasFilters && (
            <Button size="sm" variant="ghost" className="h-8" onClick={resetFilters}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          )}
        </div>
      </Card>

      <Card className="gap-0 py-0">
        {loading ? (
          <div className="space-y-3 p-6">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data.events.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
            <ScrollText className="size-8 opacity-40" />
            <p className="text-sm font-medium">No events found</p>
            <p className="text-xs">
              {hasFilters ? "Try adjusting your filters." : "Administrative actions will show up here automatically."}
            </p>
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
                {data.events.map((ev) => (
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

        {/* Pagination */}
        {data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-xs">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
