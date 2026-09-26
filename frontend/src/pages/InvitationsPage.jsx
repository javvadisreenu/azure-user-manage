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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/lib/roles";
import { Check, Copy, Loader2, MailPlus, ShieldAlert } from "lucide-react";

const ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

export default function InvitationsPage({ activeOrgId }) {
  const { get, post, del, loading, error } = useApi(activeOrgId);
  const [invitations, setInvitations] = useState([]);
  const [form, setForm] = useState({ email: "", roleCode: "User" });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState(null);

  const load = () => get("/api/invitations").then(setInvitations).catch(() => {});
  useEffect(() => {
    load();
  }, [activeOrgId]);

  async function submit(e) {
    e.preventDefault();
    setActionError(null);
    setCreated(null);
    setSending(true);
    try {
      const result = await post("/api/invitations", form);
      setCreated(result);
      setCopied(false);
      setForm({ email: "", roleCode: "User" });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    } finally {
      setSending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(created.invitationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  async function revoke(id) {
    setActionError(null);
    try {
      await del(`/api/invitations/${id}`);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
  }

  return (
    <div>
      <PageHeader
        title="Invitations"
        description="Invite new members with expiring, single-use links"
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
        {/* Create invitation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus className="text-primary size-4.5" /> Send invitation
            </CardTitle>
            <CardDescription>The recipient signs in with the link to join.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={form.roleCode} onValueChange={(v) => setForm((f) => ({ ...f, roleCode: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" disabled={loading || sending}>
                {sending && <Loader2 className="animate-spin" />}
                {sending ? "Creating…" : "Create invitation"}
              </Button>
            </form>

            {created && (
              <Alert variant="success" className="mt-4">
                <Check />
                <AlertDescription>
                  <p className="font-medium">Invitation created</p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="bg-card/60 min-w-0 flex-1 truncate rounded-md px-2 py-1.5 font-mono text-[11px]">
                      {created.invitationLink}
                    </code>
                    <Button variant="outline" size="icon-sm" onClick={copyLink} aria-label="Copy link">
                      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Pending invitations */}
        <Card className="gap-0 py-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold">Pending invitations</h2>
            {invitations.length > 0 && <Badge variant="secondary">{invitations.length}</Badge>}
          </div>
          {loading && invitations.length === 0 ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
              <MailPlus className="size-8 opacity-40" />
              <p className="text-sm font-medium">No pending invitations</p>
              <p className="text-xs">Links you create will appear here for 72 hours.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {invitations.map((inv) => (
                <li key={inv.InvitationId} className="hover:bg-muted/40 flex items-center gap-4 px-6 py-3.5 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.Email}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      Expires {new Date(inv.ExpiryUtc).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="info">{inv.RoleCode}</Badge>
                  <StatusBadge status={inv.Status} />
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => revoke(inv.InvitationId)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
