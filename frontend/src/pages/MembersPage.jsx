import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RoleBadge, StatusBadge } from "@/lib/roles";
import { Search, ShieldAlert, UserCog } from "lucide-react";
import { toast } from "sonner";

const ALL_ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];
const PAGE_SIZE = 25;

export default function MembersPage({ activeOrgId }) {
  const { get, patch, put, loading } = useApi(activeOrgId);
  const [data, setData] = useState({ members: [], total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [editing, setEditing] = useState(null);
  const [editRoles, setEditRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(null);

  const load = useCallback(
    (p = page, q = search) => {
      const params = new URLSearchParams({ page: String(p), limit: String(PAGE_SIZE) });
      if (q) params.set("search", q);
      get(`/api/organizations/${activeOrgId}/members?${params}`)
        .then((res) => setData(res))
        .catch(() => {});
    },
    [activeOrgId, get, page, search]
  );

  useEffect(() => {
    load(1, search);
    setPage(1);
  }, [activeOrgId, search]);

  useEffect(() => {
    load(page, search);
  }, [page]);

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  async function changeStatus(membershipId, status) {
    try {
      await patch(`/api/organizations/${activeOrgId}/members/${membershipId}`, { status });
      load();
      toast.success(`Member ${status === "Suspended" ? "suspended" : status === "Active" ? "reactivated" : "removed"}`);
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setConfirmStatus(null);
    }
  }

  function startEditRoles(m) {
    setEditRoles((m.Roles || "").split(",").filter(Boolean));
    setEditing(m);
  }

  function toggleRole(role) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function saveRoles() {
    if (editRoles.length === 0) {
      toast.error("A member must have at least one role.");
      return;
    }
    setSavingRoles(true);
    try {
      await put(`/api/organizations/${activeOrgId}/members/${editing.MembershipId}/roles`, {
        roles: editRoles,
      });
      setEditing(null);
      load();
      toast.success("Roles updated");
    } catch (err) {
      toast.error(err.response?.data?.error || err.message);
    } finally {
      setSavingRoles(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage membership and roles for your organization"
      />

      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" size="sm">Search</Button>
        {search && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => { setSearch(""); setSearchInput(""); }}
          >
            Clear
          </Button>
        )}
      </form>

      <Card className="gap-0 py-0">
        {loading && data.members.length === 0 ? (
          <div className="space-y-3 p-6">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : data.members.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
            <UserCog className="size-8 opacity-40" />
            <p className="text-sm font-medium">{search ? "No members match your search" : "No members yet"}</p>
            <p className="text-xs">{search ? "Try a different search term." : "Invite people to start building your team."}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                  <th className="px-4 py-3 text-left font-medium">Member</th>
                  <th className="px-4 py-3 text-left font-medium">Roles</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.members.map((m) => (
                  <tr key={m.MembershipId} className="hover:bg-muted/50 border-b transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{m.DisplayName || "—"}</p>
                      <p className="text-muted-foreground text-xs">{m.PrimaryEmail || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(m.Roles || "").split(",").filter(Boolean).map((r) => (
                          <RoleBadge key={r} role={r} />
                        ))}
                        {!(m.Roles || "").trim() && <Badge variant="secondary">No roles</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={m.Status} /></td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {new Date(m.CreatedUtc).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <Button variant="outline" size="sm" onClick={() => startEditRoles(m)}>
                          Edit roles
                        </Button>
                        {m.Status === "Active" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setConfirmStatus({ member: m, newStatus: "Suspended" })}
                          >
                            Suspend
                          </Button>
                        )}
                        {m.Status === "Suspended" && (
                          <Button size="sm" onClick={() => changeStatus(m.MembershipId, "Active")}>
                            Reactivate
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

        {/* Pagination */}
        {data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-muted-foreground text-xs">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.total)} of {data.total}
            </p>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Edit roles dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit roles</DialogTitle>
            <DialogDescription>
              {editing?.DisplayName || editing?.PrimaryEmail} — pick at least one role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2.5">
            {ALL_ROLES.map((role) => (
              <label
                key={role}
                className="hover:bg-accent/50 flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <Checkbox
                  checked={editRoles.includes(role)}
                  onCheckedChange={() => toggleRole(role)}
                />
                <span className="text-sm font-medium">{role}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveRoles} disabled={savingRoles}>
              {savingRoles ? "Saving…" : "Save roles"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend confirm dialog */}
      <Dialog open={!!confirmStatus} onOpenChange={(open) => !open && setConfirmStatus(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Suspend member?</DialogTitle>
            <DialogDescription>
              {confirmStatus?.member?.DisplayName || confirmStatus?.member?.PrimaryEmail} will lose
              access to this organization until reactivated.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmStatus(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => changeStatus(confirmStatus.member.MembershipId, "Suspended")}
            >
              Suspend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
