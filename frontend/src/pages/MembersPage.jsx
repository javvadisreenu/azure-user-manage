import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

const STATUS_BADGE = {
  Active: "badge-green",
  Suspended: "badge-yellow",
  Removed: "badge-red",
};

export default function MembersPage({ activeOrgId }) {
  const { get, patch, loading, error } = useApi(activeOrgId);
  const [members, setMembers] = useState([]);
  const [actionError, setActionError] = useState(null);

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

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Members</div>
            <div className="page-subtitle">Manage organization membership</div>
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
                        <div className="tag-list">
                          {(m.Roles || "").split(",").filter(Boolean).map((r) => (
                            <span key={r} className="badge badge-blue">{r}</span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[m.Status] || "badge-yellow"}`}>{m.Status}</span>
                      </td>
                      <td style={{ fontSize: ".8rem", color: "var(--color-muted)" }}>
                        {new Date(m.CreatedUtc).toLocaleDateString()}
                      </td>
                      <td>
                        {m.Status === "Active" && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => changeStatus(m.MembershipId, "Suspended")}
                          >
                            Suspend
                          </button>
                        )}
                        {m.Status === "Suspended" && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => changeStatus(m.MembershipId, "Active")}
                          >
                            Reactivate
                          </button>
                        )}
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
