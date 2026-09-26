import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import { getApi } from "@/apiClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2, ChevronRight, ShieldAlert } from "lucide-react";

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
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <Skeleton className="mx-auto h-10 w-10 rounded-lg" />
          <Skeleton className="mx-auto h-4 w-48" />
          <div className="space-y-2.5 pt-4">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error === "membership_required") {
    return (
      <Centered>
        <Alert variant="info" className="text-left">
          <ShieldAlert />
          <AlertTitle>No membership yet</AlertTitle>
          <AlertDescription>
            Your account is signed in but doesn't belong to any organization yet.
            Ask an administrator to send you an invite link.
          </AlertDescription>
        </Alert>
        <p className="text-muted-foreground text-xs">
          Accepted invitations activate automatically on next sign-in.
        </p>
      </Centered>
    );
  }

  if (error) {
    return (
      <Centered>
        <Alert variant="destructive" className="text-left">
          <ShieldAlert />
          <AlertTitle>Couldn't load your organizations</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Centered>
    );
  }

  if (orgs.length === 1) {
    // Defer to a microtask so we don't call a parent setState during render.
    Promise.resolve().then(() => onSelect(orgs[0].organizationId));
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
        <div className="bg-primary text-primary-foreground flex size-10 animate-pulse items-center justify-center rounded-lg">
          <Building2 className="size-5" />
        </div>
        <p className="text-muted-foreground text-sm">
          Entering <span className="text-foreground font-medium">{orgs[0].name}</span>…
        </p>
      </div>
    );
  }

  return (
    <div className="dot-grid flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="bg-primary text-primary-foreground mx-auto mb-4 flex size-11 items-center justify-center rounded-xl shadow-sm">
            <Building2 className="size-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Choose an organization</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            You're a member of {orgs.length} organizations. Pick one to continue.
          </p>
        </div>

        <div className="bg-card flex flex-col gap-2 rounded-xl border p-3 shadow-sm">
          {orgs.map((org) => (
            <button
              key={org.organizationId}
              onClick={() => onSelect(org.organizationId)}
              className="hover:bg-accent group flex cursor-pointer items-center gap-3.5 rounded-lg border border-transparent p-3.5 text-left transition-all hover:border-border hover:shadow-xs"
            >
              <span className="bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-semibold transition-colors">
                {org.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{org.name}</span>
                <span className="text-muted-foreground block font-mono text-xs">{org.code}</span>
              </span>
              <ChevronRight className="text-muted-foreground/50 size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </button>
          ))}
        </div>

        <p className="text-muted-foreground/70 mt-6 text-center text-xs">
          Signed in as {accounts[0]?.username}
        </p>
      </div>
    </div>
  );
}

function Centered({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="bg-primary text-primary-foreground mx-auto mb-2 flex size-11 items-center justify-center rounded-xl">
          <Building2 className="size-5" />
        </div>
        {children}
      </div>
    </div>
  );
}
