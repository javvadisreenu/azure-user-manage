import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { StatusBadge } from "@/lib/roles";
import { Building2, Loader2, ShieldAlert } from "lucide-react";

export default function OrganizationsPage({ activeOrgId }) {
  const { get, post, patch, loading, error } = useApi(activeOrgId);
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const [actionError, setActionError] = useState(null);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => get("/api/organizations").then(setOrgs).catch(() => {});
  useEffect(() => {
    load();
  }, [activeOrgId]);

  async function createOrg(e) {
    e.preventDefault();
    setActionError(null);
    setCreated(null);
    setBusy(true);
    try {
      await post("/api/organizations", form);
      setCreated(form.name);
      setForm({ name: "", code: "" });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(orgId, status) {
    setActionError(null);
    try {
      await patch(`/api/organizations/${orgId}`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  }

  // Auto-suggest a code slug from the name
  function onNameChange(name) {
    setForm((f) => ({
      ...f,
      name,
      code: f.code || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    }));
  }

  return (
    <div>
      <PageHeader
        title="Organizations"
        description="Create and manage every tenant on the platform"
      />

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        {/* Create form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="text-primary size-4.5" /> Create organization
            </CardTitle>
            <CardDescription>You'll be added as its TenantAdmin automatically.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createOrg} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="org-name">Name</Label>
                <Input
                  id="org-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="org-code">Code (slug)</Label>
                <Input
                  id="org-code"
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="acme-corp"
                  className="font-mono"
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {busy ? "Creating…" : "Create organization"}
              </Button>
            </form>
            {created && (
              <Alert variant="success" className="mt-4">
                <AlertDescription>
                  Created <span className="font-medium">{created}</span>.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Org list */}
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold">All organizations</h2>
            {orgs.length > 0 && <Badge variant="secondary">{orgs.length}</Badge>}
          </div>
          {loading && orgs.length === 0 ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orgs.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
              <Building2 className="size-8 opacity-40" />
              <p className="text-sm font-medium">No organizations yet</p>
              <p className="text-xs">Create your first tenant with the form.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                    <th className="px-4 py-3 text-left font-medium">Organization</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((o) => (
                    <tr key={o.OrganizationId} className="hover:bg-muted/50 border-b transition-colors last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{o.Name}</p>
                        <p className="text-muted-foreground font-mono text-xs">{o.Code}</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={o.Status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          {o.Status === "Active" && (
                            <Button variant="outline" size="sm" onClick={() => setStatus(o.OrganizationId, "Suspended")}>
                              Suspend
                            </Button>
                          )}
                          {o.Status === "Suspended" && (
                            <Button size="sm" onClick={() => setStatus(o.OrganizationId, "Active")}>
                              Activate
                            </Button>
                          )}
                          {o.Status !== "Archived" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setStatus(o.OrganizationId, "Archived")}
                            >
                              Archive
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
