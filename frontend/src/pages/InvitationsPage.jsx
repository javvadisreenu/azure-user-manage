import { useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/lib/roles";
import { Check, Copy, Loader2, MailPlus, Upload, X } from "lucide-react";
import { toast } from "sonner";

const ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

function expiryLabel(expiryUtc) {
  const ms = new Date(expiryUtc) - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return "< 1 hour left";
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h left`;
}

function parseCsv(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, roleCode] = line.split(",").map((s) => s.trim());
      return { email: email || "", roleCode: roleCode || "User" };
    })
    .filter((r) => r.email && r.email !== "email");
}

export default function InvitationsPage({ activeOrgId }) {
  const { get, post, del, loading } = useApi(activeOrgId);
  const [invitations, setInvitations] = useState([]);
  const [form, setForm] = useState({ email: "", roleCode: "User" });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [bulkSending, setBulkSending] = useState(false);
  const fileRef = useRef(null);

  const load = () => get("/api/invitations").then(setInvitations).catch(() => {});
  useEffect(() => { load(); }, [activeOrgId]);

  async function submit(e) {
    e.preventDefault();
    setCreated(null);
    setSending(true);
    try {
      const result = await post("/api/invitations", form);
      setCreated(result);
      setCopied(false);
      setForm({ email: "", roleCode: "User" });
      load();
      toast.success("Invitation created");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
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
    try {
      await del(`/api/invitations/${id}`);
      load();
      toast.success("Invitation revoked");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    }
  }

  async function handleBulkFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length === 0) {
      toast.error("No valid rows found in CSV");
      return;
    }
    if (rows.length > 50) {
      toast.error("Maximum 50 rows per upload");
      return;
    }
    setBulkResults(null);
    setBulkSending(true);
    try {
      const result = await post("/api/invitations/bulk", { invitations: rows });
      setBulkResults(result.results);
      load();
      const created = result.results.filter((r) => r.status === "created").length;
      const failed = result.results.length - created;
      toast.success(`${created} invitation${created !== 1 ? "s" : ""} created${failed ? `, ${failed} failed` : ""}`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setBulkSending(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div>
      <PageHeader
        title="Invitations"
        description="Invite new members with expiring, single-use links"
      >
        <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
          <Upload className="size-4" /> Bulk upload CSV
        </Button>
      </PageHeader>

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
              <div className="bg-muted/50 mt-4 rounded-lg border p-3">
                <p className="text-sm font-medium">Invitation link</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="bg-card min-w-0 flex-1 truncate rounded-md border px-2 py-1.5 font-mono text-[11px]">
                    {created.invitationLink}
                  </code>
                  <Button variant="outline" size="icon-sm" onClick={copyLink} aria-label="Copy link">
                    {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
                  </Button>
                </div>
              </div>
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
                      {expiryLabel(inv.ExpiryUtc)}
                    </p>
                  </div>
                  <Badge variant="info">{inv.RoleCode}</Badge>
                  <StatusBadge status={inv.Status} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => revoke(inv.InvitationId)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Bulk upload dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk invite via CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV with columns: <code className="font-mono text-xs">email,roleCode</code>.
              The header row is skipped. Role defaults to <code className="font-mono text-xs">User</code> if omitted.
              Maximum 50 rows.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-dashed p-6 text-center">
              <Upload className="text-muted-foreground mx-auto mb-2 size-8" />
              <p className="text-sm font-medium">Choose a CSV file</p>
              <p className="text-muted-foreground mt-1 text-xs">email,roleCode on each row</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="mt-3 text-sm"
                onChange={handleBulkFile}
                disabled={bulkSending}
              />
            </div>

            {bulkSending && (
              <div className="flex items-center gap-2 text-sm">
                <Loader2 className="size-4 animate-spin" /> Creating invitations…
              </div>
            )}

            {bulkResults && (
              <div className="max-h-60 overflow-y-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted text-muted-foreground border-b">
                      <th className="px-3 py-2 text-left font-medium">Email</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkResults.map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono">{r.email}</td>
                        <td className="px-3 py-2">
                          {r.status === "created" ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <Check className="size-3" /> Created
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive">
                              <X className="size-3" /> {r.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
