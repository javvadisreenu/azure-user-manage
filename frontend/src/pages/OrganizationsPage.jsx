import { useEffect, useState } from "react";
import { useApi } from "../hooks/useApi";

const STATUS_BADGE = {
  Active: "badge-green",
  Suspended: "badge-yellow",
  Archived: "badge-red",
};

export default function OrganizationsPage({ activeOrgId }) {
  const { get, post, patch, loading, error } = useApi(activeOrgId);
  const [orgs, setOrgs] = useState([]);
  const [form, setForm] = useState({ name: "", code: "" });
  const [actionError, setActionError] = useState(null);
  const [created, setCreated] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => get("/api/organizations").then(setOrgs).catch(() => {});
  useEffect(() => { load(); }, [activeOrgId]);

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
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Organizations</div>
            <div className="page-subtitle">Create and manage tenant organizations</div>
          </div>
        </div>

        {actionError && <div className="alert alert-error">{actionError}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Create form */}
          <div className="card">
            <div className="section-title">Create organization</div>
            <form onSubmit={createOrg}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
              <div className="form-group">
                <label>Code (slug)</label>
                <input
                  type="text"
                  required
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="acme-corp"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? "Creating…" : "Create organization"}
              </button>
              {created && (
                <div className="alert alert-success" style={{ marginTop: "1rem" }}>
                  Created <strong>{created}</strong>.
                </div>
              )}
            </form>
          </div>

          {/* Org list */}
          <div className="card">
            <div className="section-title">All organizations</div>
            {loading && <div className="spinner" />}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.length === 0 && !loading && (
                    <tr><td colSpan={4} style={{ color: "var(--color-muted)", textAlign: "center" }}>No organizations</td></tr>
                  )}
                  {orgs.map((o) => (
                    <tr key={o.OrganizationId}>
                      <td style={{ fontWeight: 500 }}>{o.Name}</td>
                      <td style={{ fontFamily: "monospace", fontSize: ".8rem" }}>{o.Code}</td>
                      <td><span className={`badge ${STATUS_BADGE[o.Status] || "badge-yellow"}`}>{o.Status}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: ".4rem", flexWrap: "wrap" }}>
                          {o.Status === "Active" && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setStatus(o.OrganizationId, "Suspended")}>
                              Suspend
                            </button>
                          )}
                          {o.Status === "Suspended" && (
                            <button className="btn btn-primary btn-sm" onClick={() => setStatus(o.OrganizationId, "Active")}>
                              Activate
                            </button>
                          )}
                          {o.Status !== "Archived" && (
                            <button className="btn btn-danger btn-sm" onClick={() => setStatus(o.OrganizationId, "Archived")}>
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
