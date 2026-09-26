import { useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ShieldAlert, UserCog } from "lucide-react";

const ALL_ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

export default function MembersPage({ activeOrgId }) {
  const { get, patch, put, loading, error } = useApi(activeOrgId);
  const [members, setMembers] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [editing, setEditing] = useState(null); // member being edited
  const [editRoles, setEditRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const load = () =>
    get(`/api/organizations/${activeOrgId}/members`)
      .then(setMembers)
      .catch(() => {});

  useEffect(() => {
    load();
  }, [activeOrgId]);

  async function changeStatus(membershipId, status) {
    setActionError(null);
    try {
      await patch(`/api/organizations/${activeOrgId}/members/${membershipId}`, { status });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
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
      setActionError("A member must have at least one role.");
      return;
    }
    setActionError(null);
    setSavingRoles(true);
    try {
      await put(`/api/organizations/${activeOrgId}/members/${editing.MembershipId}/roles`, {
        roles: editRoles,
      });
      setEditing(null);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    } finally {
      setSavingRoles(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Members"
        description="Manage membership and roles for your organization"
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

      <Card className="gap-0 py-0">
        {loading && members.length === 0 ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
            <UserCog className="size-8 opacity-40" />
            <p className="text-sm font-medium">No members yet</p>
            <p className="text-xs">Invite people to start building your team.</p>
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
                {members.map((m) => (
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
                          <Button variant="outline" size="sm" onClick={() => changeStatus(m.MembershipId, "Suspended")}>
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
    </div>
  );
}
