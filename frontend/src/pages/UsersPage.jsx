import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

const ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

export default function UsersPage({ activeOrgId }) {
  const { get, post, loading, error } = useApi(activeOrgId);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [orgs, setOrgs] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [actionOk, setActionOk] = useState(null);
  const [assign, setAssign] = useState(null); // { userId, orgId, roleCode }

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
    setAssign({ userId: user.userId, email: user.primaryEmail, orgId: orgs[0]?.OrganizationId || "", roleCode: "User" });
  }

  async function submitAssign() {
    if (!assign.orgId) { setActionError("Select an organization."); return; }
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
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">User Directory</div>
            <div className="page-subtitle">All users across every organization</div>
          </div>
        </div>

        {actionError && <div className="alert alert-error">{actionError}</div>}
        {actionOk && <div className="alert alert-success">{actionOk}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: "1rem" }}>
          <form onSubmit={submitSearch} style={{ display: "flex", gap: ".75rem" }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" type="submit">Search</button>
            {search && (
              <button className="btn btn-secondary" type="button" onClick={() => { setSearch(""); loadUsers(""); }}>
                Clear
              </button>
            )}
          </form>
        </div>

        {loading && <div className="spinner" />}

        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Orgs</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ color: "var(--color-muted)", textAlign: "center" }}>No users found</td></tr>
                )}
                {users.map((u) => (
                  <tr key={u.userId}>
                    <td style={{ fontWeight: 500 }}>{u.displayName || "—"}</td>
                    <td>{u.primaryEmail || "—"}</td>
                    <td><span className="badge badge-blue">{u.orgCount}</span></td>
                    <td style={{ fontSize: ".8rem", color: "var(--color-muted)" }}>
                      {u.createdUtc ? new Date(u.createdUtc).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => startAssign(u)}>
                        Add to org
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Assign-to-org panel */}
        {assign && (
          <div className="card" style={{ marginTop: "1rem", maxWidth: 480 }}>
            <div className="section-title">Add {assign.email} to an organization</div>
            <div className="form-group">
              <label>Organization</label>
              <select
                value={assign.orgId}
                onChange={(e) => setAssign((a) => ({ ...a, orgId: e.target.value }))}
              >
                {orgs.map((o) => (
                  <option key={o.OrganizationId} value={o.OrganizationId}>{o.Name} ({o.Code})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={assign.roleCode}
                onChange={(e) => setAssign((a) => ({ ...a, roleCode: e.target.value }))}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", gap: ".5rem" }}>
              <button className="btn btn-primary" onClick={submitAssign}>Add member</button>
              <button className="btn btn-secondary" onClick={() => setAssign(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
