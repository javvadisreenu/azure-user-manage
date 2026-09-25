import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { getApi } from "../apiClient";

export default function OrgSelector({ onSelect }) {
  const { instance, accounts } = useMsal();
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getApi(instance, accounts[0], "/api/tenant-selector")
      .then((res) => setOrgs(res.data))
      .catch((err) => {
        const data = err.response?.data;
        setError(data?.error || err.message);
      })
      .finally(() => setLoading(false));
  }, [instance, accounts]);

  if (loading) {
    return (
      <div className="auth-page">
        <div className="spinner" />
        <p>Loading your organizations…</p>
      </div>
    );
  }

  if (error === "membership_required") {
    return (
      <div className="auth-page">
        <div className="auth-logo">SaaS SSO</div>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: ".5rem" }}>No membership found</p>
          <p style={{ color: "var(--color-muted)", fontSize: ".9rem" }}>
            You need an invitation to join an organization. Ask your administrator to send you an invite link.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="alert alert-error">Error: {error}</div>
      </div>
    );
  }

  if (orgs.length === 1) {
    // Defer to an effect-like microtask so we don't call a parent setState
    // during this component's render.
    Promise.resolve().then(() => onSelect(orgs[0].organizationId));
    return (
      <div className="auth-page">
        <div className="spinner" />
        <p>Entering {orgs[0].name}…</p>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">SaaS SSO</div>
      <div className="card" style={{ width: "100%", maxWidth: 440 }}>
        <p style={{ fontWeight: 600, marginBottom: "1rem" }}>Choose an organization</p>
        <div className="org-list">
          {orgs.map((org) => (
            <div key={org.organizationId} className="org-item" onClick={() => onSelect(org.organizationId)}>
              <div>
                <div className="org-name">{org.name}</div>
                <div className="org-code">{org.code}</div>
              </div>
              <span style={{ color: "var(--color-primary)", fontSize: "1.1rem" }}>→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
