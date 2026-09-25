import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "../authConfig";
import { postApi } from "../apiClient";

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("idle"); // idle | signing-in | accepting | done | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invitation token found in the URL.");
      return;
    }
    if (!isAuthenticated) {
      setStatus("signing-in");
      instance.loginRedirect({
        ...loginRequest,
        state: `invite:${token}`,
        redirectUri: `${window.location.origin}/accept-invite?token=${token}`,
      });
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !token || status !== "idle") return;
    setStatus("accepting");
    postApi(instance, accounts[0], "/api/invitations/accept", { token })
      .then(() => {
        setStatus("done");
        setTimeout(() => navigate("/"), 2000);
      })
      .catch((err) => {
        const code = err.response?.data?.error || err.message;
        setStatus("error");
        setMessage(
          code === "invitation_invalid_or_expired"
            ? "This invitation has expired or has already been used."
            : code === "identity_already_provisioned"
            ? "Your account is already set up. Redirecting…"
            : `Error: ${code}`
        );
        if (code === "identity_already_provisioned") {
          setTimeout(() => navigate("/"), 1500);
        }
      });
  }, [isAuthenticated, token]);

  return (
    <div className="auth-page">
      <div className="auth-logo">SaaS SSO</div>
      <div className="card" style={{ maxWidth: 400, textAlign: "center" }}>
        {status === "idle" && <p>Preparing your invitation…</p>}
        {status === "signing-in" && <><div className="spinner" style={{ margin: "0 auto 1rem" }} /><p>Redirecting to sign-in…</p></>}
        {status === "accepting" && <><div className="spinner" style={{ margin: "0 auto 1rem" }} /><p>Accepting invitation…</p></>}
        {status === "done" && (
          <>
            <div style={{ fontSize: "2rem", marginBottom: ".5rem" }}>✓</div>
            <p style={{ fontWeight: 600 }}>You're in!</p>
            <p style={{ color: "var(--color-muted)", fontSize: ".9rem", marginTop: ".3rem" }}>
              Redirecting to your dashboard…
            </p>
          </>
        )}
        {status === "error" && <div className="alert alert-error">{message}</div>}
      </div>
    </div>
  );
}
