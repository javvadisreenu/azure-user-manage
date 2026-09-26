import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { useApi } from "@/hooks/useApi";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { KeyRound, ShieldAlert } from "lucide-react";

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
    return (
      <div>
        <PageHeader title="Profile" description="Loading…" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }
  if (error && !me) {
    return (
      <Alert variant="destructive">
        <ShieldAlert />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
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
    <div>
      <PageHeader title="Profile" description="Manage your account details" />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Editable profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal details</CardTitle>
            <CardDescription>How you appear to others in the console.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="grid gap-6">
              <div className="flex items-center gap-4">
                <Avatar className="size-14">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{form.displayName || "—"}</p>
                  <p className="text-muted-foreground truncate text-sm">{me.user.primaryEmail}</p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="displayName">Display name</Label>
                <Input
                  id="displayName"
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="primaryEmail">Email</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={form.primaryEmail}
                  onChange={(e) => setForm((f) => ({ ...f, primaryEmail: e.target.value }))}
                  placeholder="you@example.com"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                {saved && <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Profile updated ✓</span>}
              </div>
              {saveError && (
                <Alert variant="destructive">
                  <ShieldAlert />
                  <AlertDescription>{saveError}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Account & security */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account &amp; security</CardTitle>
            <CardDescription>Identity managed by Microsoft Entra.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-2.5">
              <Label className="items-start gap-0">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="size-3.5" /> Password
                </span>
              </Label>
              <p className="text-muted-foreground text-sm">
                Your password is managed by Microsoft Entra. Update it on Microsoft's secure page.
              </p>
              <div>
                <Button variant="outline" onClick={changePassword}>Change password</Button>
              </div>
            </div>

            <Separator />

            <div className="grid gap-3">
              <p className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
                Identity details
              </p>
              <Detail label="Signed in as" value={account?.username} mono />
              <Detail label="User ID" value={me.user.userId} mono />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="grid gap-0.5">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className={`min-w-0 truncate text-sm ${mono ? "font-mono text-xs" : ""}`}>{value || "—"}</span>
    </div>
  );
}
