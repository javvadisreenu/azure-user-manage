import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

export default function LandingPage() {
  const { instance } = useMsal();

  function signIn() {
    instance.loginRedirect(loginRequest);
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">SaaS SSO</div>
      <p className="auth-tagline">Multi-tenant SaaS with Microsoft Entra External ID</p>
      <button className="btn btn-primary" onClick={signIn} style={{ fontSize: "1rem", padding: ".65rem 2rem" }}>
        Sign in
      </button>
      <p style={{ fontSize: ".8rem", color: "var(--color-muted)", textAlign: "center", maxWidth: 340 }}>
        Powered by Microsoft Entra External ID. Sign up or sign in with your existing account.
      </p>
    </div>
  );
}
