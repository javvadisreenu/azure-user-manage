import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "../hooks/useApi";

export default function Dashboard({ activeOrgId }) {
  const { get, loading, error } = useApi(activeOrgId);
  const [me, setMe] = useState(null);

  useEffect(() => {
    get("/api/me").then(setMe).catch(() => {});
  }, [activeOrgId]);

  if (loading && !me) {
    return <div className="page container"><div className="spinner" /></div>;
  }

  if (error) {
    return <div className="page container"><div className="alert alert-error">{error}</div></div>;
  }

  if (!me) return null;

  const roleBadge = (role) => {
    const map = {
      PlatformAdmin: "badge-red",
      TenantAdmin: "badge-blue",
      Manager: "badge-blue",
      User: "badge-green",
      ReadOnly: "badge-yellow",
    };
    return <span className={`badge ${map[role] || "badge-green"}`}>{role}</span>;
  };

  const isTenantAdmin = me.tenant.roles.includes("TenantAdmin") || me.tenant.roles.includes("PlatformAdmin");

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Dashboard</div>
            <div className="page-subtitle">{me.tenant.organizationName} ({me.tenant.organizationCode})</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <div className="card">
            <div style={{ color: "var(--color-muted)", fontSize: ".8rem", marginBottom: ".3rem" }}>Signed in as</div>
            <div style={{ fontWeight: 600 }}>{me.user.displayName || me.user.primaryEmail}</div>
            <div style={{ fontSize: ".85rem", color: "var(--color-muted)" }}>{me.user.primaryEmail}</div>
          </div>
          <div className="card">
            <div style={{ color: "var(--color-muted)", fontSize: ".8rem", marginBottom: ".5rem" }}>Your roles</div>
            <div className="tag-list">
              {me.tenant.roles.length > 0
                ? me.tenant.roles.map((r) => <span key={r}>{roleBadge(r)}</span>)
                : <span className="badge badge-yellow">No roles</span>}
            </div>
          </div>
          <div className="card">
            <div style={{ color: "var(--color-muted)", fontSize: ".8rem", marginBottom: ".3rem" }}>Organization</div>
            <div style={{ fontWeight: 600 }}>{me.tenant.organizationName}</div>
            <div style={{ fontSize: ".85rem", color: "var(--color-muted)" }}>ID: {me.tenant.organizationId}</div>
          </div>
        </div>

        {isTenantAdmin && (
          <div className="section">
            <div className="section-title">Administration</div>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Link to="/members" className="btn btn-secondary">Manage Members</Link>
              <Link to="/invitations" className="btn btn-secondary">Invite Users</Link>
              <Link to="/audit" className="btn btn-secondary">Audit Log</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
