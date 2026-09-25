import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

const ROLES = ["TenantAdmin", "Manager", "User", "ReadOnly"];

export default function InvitationsPage({ activeOrgId }) {
  const { get, post, del, loading, error } = useApi(activeOrgId);
  const [invitations, setInvitations] = useState([]);
  const [form, setForm] = useState({ email: "", roleCode: "User" });
  const [created, setCreated] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = () => get("/api/invitations").then(setInvitations).catch(() => {});
  useEffect(() => { load(); }, [activeOrgId]);

  async function submit(e) {
    e.preventDefault();
    setActionError(null);
    setCreated(null);
    try {
      const result = await post("/api/invitations", form);
      setCreated(result);
      setForm({ email: "", roleCode: "User" });
      load();
    } catch (err) {
      setActionError(err.response?.data?.error || err.message);
    }
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
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Invitations</div>
            <div className="page-subtitle">Invite new members to your organization</div>
          </div>
        </div>

        {actionError && <div className="alert alert-error">{actionError}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          <div className="card">
            <div className="section-title">Send invitation</div>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Email address</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                />
              </div>
              <div className="form-group">
                <label>Role</label>
                <select value={form.roleCode} onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value }))}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send invitation"}
              </button>
            </form>

            {created && (
              <div className="alert alert-success" style={{ marginTop: "1rem" }}>
                <strong>Invitation created!</strong>
                <br />
                <span style={{ fontSize: ".8rem", wordBreak: "break-all" }}>
                  Link: {created.invitationLink}
                </span>
              </div>
            )}
          </div>

          <div className="card">
            <div className="section-title">Pending invitations</div>
            {invitations.length === 0 && (
              <p style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>No pending invitations.</p>
            )}
            {invitations.map((inv) => (
              <div key={inv.InvitationId} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: ".5rem 0", borderBottom: "1px solid var(--color-border)"
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{inv.Email}</div>
                  <div style={{ fontSize: ".8rem", color: "var(--color-muted)" }}>
                    <span className="badge badge-blue" style={{ marginRight: ".3rem" }}>{inv.RoleCode}</span>
                    Expires {new Date(inv.ExpiryUtc).toLocaleDateString()}
                  </div>
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => revoke(inv.InvitationId)}>
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
