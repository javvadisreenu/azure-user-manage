import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

const STATUS_BADGE = {
  Active: "badge-green",
  Suspended: "badge-yellow",
  Removed: "badge-red",
};

const ALL_ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

export default function MembersPage({ activeOrgId }) {
  const { get, patch, put, loading, error } = useApi(activeOrgId);
  const [members, setMembers] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [editing, setEditing] = useState(null); // membershipId being edited
  const [editRoles, setEditRoles] = useState([]);
  const [savingRoles, setSavingRoles] = useState(false);

  const load = () =>
    get(`/api/organizations/${activeOrgId}/members`)
      .then(setMembers)
      .catch(() => {});

  useEffect(() => { load(); }, [activeOrgId]);

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
    setEditing(m.MembershipId);
    setEditRoles((m.Roles || "").split(",").filter(Boolean));
  }

  function toggleRole(role) {
    setEditRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  async function saveRoles(membershipId) {
    if (editRoles.length === 0) {
      setActionError("A member must have at least one role.");
      return;
    }
    setActionError(null);
    setSavingRoles(true);
    try {
      await put(`/api/organizations/${activeOrgId}/members/${membershipId}/roles`, { roles: editRoles });
      setEditing(null);
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    } finally {
      setSavingRoles(false);
    }
  }

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Members</div>
            <div className="page-subtitle">Manage organization membership and roles</div>
          </div>
        </div>

        {actionError && <div className="alert alert-error">{actionError}</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {loading && <div className="spinner" />}

        {!loading && (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Roles</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 && (
                    <tr><td colSpan={6} style={{ color: "var(--color-muted)", textAlign: "center" }}>No members</td></tr>
                  )}
                  {members.map((m) => (
                    <tr key={m.MembershipId}>
                      <td>{m.DisplayName || "—"}</td>
                      <td>{m.PrimaryEmail || "—"}</td>
                      <td>
                        {editing === m.MembershipId ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: ".4rem" }}>
                            {ALL_ROLES.map((r) => (
                              <label key={r} style={{
                                display: "flex", alignItems: "center", gap: ".25rem",
                                fontSize: ".8rem", cursor: "pointer",
                              }}>
                                <input
                                  type="checkbox"
                                  checked={editRoles.includes(r)}
                                  onChange={() => toggleRole(r)}
                                />
                                {r}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="tag-list">
                            {(m.Roles || "").split(",").filter(Boolean).map((r) => (
                              <span key={r} className="badge badge-blue">{r}</span>
                            ))}
                            {!(m.Roles || "").trim() && <span style={{ color: "var(--color-muted)", fontSize: ".8rem" }}>No roles</span>}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[m.Status] || "badge-yellow"}`}>{m.Status}</span>
                      </td>
                      <td style={{ fontSize: ".8rem", color: "var(--color-muted)" }}>
                        {new Date(m.CreatedUtc).toLocaleDateString()}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                          {editing === m.MembershipId ? (
                            <>
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={savingRoles}
                                onClick={() => saveRoles(m.MembershipId)}
                              >
                                {savingRoles ? "Saving…" : "Save"}
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(null)}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="btn btn-secondary btn-sm" onClick={() => startEditRoles(m)}>
                                Edit roles
                              </button>
                              {m.Status === "Active" && (
                                <button className="btn btn-secondary btn-sm" onClick={() => changeStatus(m.MembershipId, "Suspended")}>
                                  Suspend
                                </button>
                              )}
                              {m.Status === "Suspended" && (
                                <button className="btn btn-primary btn-sm" onClick={() => changeStatus(m.MembershipId, "Active")}>
                                  Reactivate
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
