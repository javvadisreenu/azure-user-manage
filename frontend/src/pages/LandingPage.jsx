import { useMsal } from "@azure/msal-react";
import { loginRequest, signUpRequest } from "../authConfig";

export default function LandingPage() {
  const { instance } = useMsal();

  function signIn() {
    instance.loginRedirect(loginRequest);
  }

  function signUp() {
    instance.loginRedirect(signUpRequest);
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">SaaS SSO</div>
      <p className="auth-tagline">Multi-tenant SaaS with Microsoft Entra External ID</p>
      <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
        <button className="btn btn-primary" onClick={signIn} style={{ fontSize: "1rem", padding: ".65rem 2rem" }}>
          Sign in
        </button>
        <button className="btn btn-secondary" onClick={signUp} style={{ fontSize: "1rem", padding: ".65rem 2rem" }}>
          Sign up
        </button>
      </div>
      <p style={{ fontSize: ".8rem", color: "var(--color-muted)", textAlign: "center", maxWidth: 340 }}>
        Powered by Microsoft Entra External ID.
      </p>
    </div>
  );
}
