import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useApi } from "../hooks/useApi";

export default function ProfilePage({ activeOrgId }) {
  const { instance, accounts } = useMsal();
  const { get, patch, loading, error } = useApi(activeOrgId);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ displayName: "", primaryEmail: "" });
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    get("/api/me")
      .then((data) => {
        setMe(data);
        setForm({
          displayName: data.user.displayName || "",
          primaryEmail: data.user.primaryEmail || "",
        });
      })
      .catch(() => {});
  }, [activeOrgId]);

  async function save(e) {
    e.preventDefault();
    setSaved(false);
    setSaveError(null);
    setSaving(true);
    try {
      await patch("/api/me", {
        displayName: form.displayName,
        primaryEmail: form.primaryEmail,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  // Password changes are handled by Entra, not this app — force re-auth so the
  // user can update their password on Microsoft's own secure page.
  function changePassword() {
    instance.loginRedirect({
      scopes: ["openid", "profile"],
      prompt: "login",
    });
  }

  if (loading && !me) {
    return <div className="page container"><div className="spinner" /></div>;
  }
  if (error && !me) {
    return <div className="page container"><div className="alert alert-error">{error}</div></div>;
  }
  if (!me) return null;

  const account = accounts[0];
  const initials = (form.displayName || me.user.primaryEmail || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div>
            <div className="page-title">Profile</div>
            <div className="page-subtitle">Manage your account details</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Editable profile */}
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "var(--color-primary)", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "1.25rem",
              }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{form.displayName || "—"}</div>
                <div style={{ fontSize: ".85rem", color: "var(--color-muted)" }}>{me.user.primaryEmail}</div>
              </div>
            </div>

            <form onSubmit={save}>
              <div className="form-group">
                <label>Display name</label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={form.primaryEmail}
                  onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                  placeholder="you@example.com"
                />
              </div>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              {saved && <div className="alert alert-success" style={{ marginTop: "1rem" }}>Profile updated.</div>}
              {saveError && <div className="alert alert-error" style={{ marginTop: "1rem" }}>{saveError}</div>}
            </form>
          </div>

          {/* Account & security */}
          <div className="card">
            <div className="section-title">Account &amp; security</div>

            <div className="form-group">
              <label>Password</label>
              <p style={{ fontSize: ".85rem", color: "var(--color-muted)", margin: "0 0 .5rem" }}>
                Your password is managed by Microsoft Entra. Click below to update it securely.
              </p>
              <button className="btn btn-secondary" type="button" onClick={changePassword}>
                Change password
              </button>
            </div>

            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: ".75rem", textTransform: "uppercase", letterSpacing: ".05em", color: "var(--color-muted)", marginBottom: ".5rem" }}>
                Identity details
              </div>
              <dl style={{ margin: 0, fontSize: ".85rem" }}>
                <div style={{ marginBottom: ".4rem" }}>
                  <dt style={{ color: "var(--color-muted)" }}>Signed in as</dt>
                  <dd style={{ margin: 0, wordBreak: "break-all" }}>{account?.username}</dd>
                </div>
                <div>
                  <dt style={{ color: "var(--color-muted)" }}>User ID</dt>
                  <dd style={{ margin: 0, wordBreak: "break-all", fontFamily: "monospace", fontSize: ".8rem" }}>
                    {me.user.userId}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
