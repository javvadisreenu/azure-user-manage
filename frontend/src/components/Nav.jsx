import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { Link, useLocation } from "react-router-dom";
import { useApi } from "../hooks/useApi";

export default function Nav({ activeOrgId, onClearOrg }) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const location = useLocation();
  const { get } = useApi(activeOrgId);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (activeOrgId) {
      get("/api/me").then((me) => setRoles(me.tenant.roles || [])).catch(() => {});
    }
  }, [activeOrgId]);

  function signOut() {
    sessionStorage.removeItem("activeOrgId");
    onClearOrg();
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  const isPlatformAdmin = roles.includes("PlatformAdmin");
  const isAdmin = isPlatformAdmin || roles.includes("TenantAdmin");

  const navLinks = [
    { to: "/dashboard", label: "Dashboard", show: true },
    { to: "/members", label: "Members", show: isAdmin },
    { to: "/invitations", label: "Invitations", show: isAdmin },
    { to: "/audit", label: "Audit Log", show: isAdmin },
    { to: "/organizations", label: "Organizations", show: isPlatformAdmin },
    { to: "/users", label: "Users", show: isPlatformAdmin },
  ];

  return (
    <nav className="nav">
      <div className="container nav-inner">
        <span className="nav-brand">SaaS SSO</span>

        <div style={{ display: "flex", gap: "1.25rem", alignItems: "center", flexWrap: "wrap" }}>
          {activeOrgId && navLinks.filter((l) => l.show).map((l) => (
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
          {activeOrgId && (
            <Link
              to="/profile"
              className="nav-user"
              style={{ textDecoration: "none", color: location.pathname === "/profile" ? "var(--color-primary)" : undefined }}
            >
              {account?.username || account?.name}
            </Link>
          )}
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
