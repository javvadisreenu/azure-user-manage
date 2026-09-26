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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, ShieldAlert, UserPlus, Users } from "lucide-react";

const ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

export default function UsersPage({ activeOrgId }) {
  const { get, post, loading, error } = useApi(activeOrgId);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [actionOk, setActionOk] = useState(null);
  const [assign, setAssign] = useState(null); // { userId, email, orgId, roleCode }

  const loadUsers = (q = "") => {
    const path = q ? `/api/users?search=${encodeURIComponent(q)}` : "/api/users";
    get(path).then(setUsers).catch(() => {});
  };

  useEffect(() => {
    loadUsers();
    get("/api/organizations").then(setOrgs).catch(() => {});
  }, [activeOrgId]);

  function submitSearch(e) {
    e.preventDefault();
    loadUsers(search);
  }

  function startAssign(user) {
    setActionError(null);
    setActionOk(null);
    setAssign({
      userId: user.userId,
      email: user.primaryEmail,
      orgId: orgs[0]?.OrganizationId || "",
      roleCode: "User",
    });
  }

  async function submitAssign() {
    if (!assign.orgId) {
      setActionError("Select an organization.");
      return;
    }
    setActionError(null);
    try {
      await post(`/api/organizations/${assign.orgId}/members`, {
        userId: assign.userId,
        roleCode: assign.roleCode,
      });
      const orgName = orgs.find((o) => o.OrganizationId === assign.orgId)?.Name;
      setActionOk(`Added ${assign.email} to ${orgName} as ${assign.roleCode}.`);
      setAssign(null);
      loadUsers(search);
    } catch (err) {
      const code = err.response?.data?.error || err.message;
      setActionError(code === "already_member" ? "User is already a member of that organization." : code);
    }
  }

  return (
    <div>
      <PageHeader
        title="User Directory"
        description="All users across every organization on the platform"
      />

      {actionError && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}
      {actionOk && (
        <Alert variant="success" className="mb-4">
          <AlertDescription>{actionOk}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6 gap-0 py-0">
        <form onSubmit={submitSearch} className="flex gap-2.5 p-4">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="pl-9"
            />
          </div>
          <Button type="submit">Search</Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch("");
                loadUsers("");
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </Card>

      <Card className="gap-0 py-0">
        {loading && users.length === 0 ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Users className="size-8 opacity-40" />
            <p className="text-sm font-medium">No users found</p>
            <p className="text-xs">Try a different search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-xs tracking-wide uppercase">
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Organizations</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId} className="hover:bg-muted/50 border-b transition-colors last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.displayName || "—"}</p>
                      <p className="text-muted-foreground text-xs">{u.primaryEmail || "—"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="info">{u.orgCount} {u.orgCount === 1 ? "org" : "orgs"}</Badge>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-xs">
                      {u.createdUtc ? new Date(u.createdUtc).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" onClick={() => startAssign(u)}>
                        <UserPlus className="size-3.5" /> Add to org
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Assign-to-org dialog */}
      <Dialog open={!!assign} onOpenChange={(open) => !open && setAssign(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to organization</DialogTitle>
            <DialogDescription>
              Grant <span className="font-medium">{assign?.email}</span> a membership in one of your organizations.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label>Organization</Label>
              <Select value={assign?.orgId} onValueChange={(v) => setAssign((a) => ({ ...a, orgId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.OrganizationId} value={o.OrganizationId}>
                      {o.Name} ({o.Code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select value={assign?.roleCode} onValueChange={(v) => setAssign((a) => ({ ...a, roleCode: v }))}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssign(null)}>Cancel</Button>
            <Button onClick={submitAssign}>Add member</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
