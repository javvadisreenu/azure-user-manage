import { useMsal } from "@azure/msal-react";
import { Link, useLocation } from "react-router-dom";

export default function Nav({ activeOrgId, onClearOrg }) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const location = useLocation();

  function signOut() {
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/members", label: "Members" },
    { to: "/invitations", label: "Invitations" },
    { to: "/audit", label: "Audit Log" },
  ];

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <span className="nav-brand">SaaS SSO</span>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          {activeOrgId && navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              style={{
                fontSize: ".875rem",
                fontWeight: location.pathname === l.to ? 600 : 400,
                color: location.pathname === l.to ? "var(--color-primary)" : "var(--color-text)",
              }}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="nav-actions">
          <span className="nav-user">{account?.username || account?.name}</span>
          {activeOrgId && (
            <button className="btn btn-secondary btn-sm" onClick={onClearOrg}>
              Switch Org
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}
