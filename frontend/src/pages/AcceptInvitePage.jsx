import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { loginRequest } from "@/authConfig";
import { postApi } from "@/apiClient";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";

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
    <div className="dot-grid flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm items-center gap-6 py-10 text-center">
        <div className="flex flex-col items-center gap-4">
          {status === "error" ? (
            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <ShieldAlert className="size-6" />
            </div>
          ) : status === "done" ? (
            <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-6" />
            </div>
          ) : (
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}

          <div>
            <p className="text-lg font-semibold tracking-tight">
              {status === "idle" && "Preparing your invitation"}
              {status === "signing-in" && "Redirecting to sign-in…"}
              {status === "accepting" && "Accepting invitation…"}
              {status === "done" && "You're in!"}
              {status === "error" && "Couldn't accept invitation"}
            </p>
            <p className="text-muted-foreground mt-1.5 max-w-64 text-sm">
              {status === "done"
                ? "Your membership is active. Redirecting to your dashboard…"
                : status === "error"
                  ? message
                  : "This only takes a moment."}
            </p>
          </div>
        </div>

        {status === "error" && (
          <Alert variant="destructive" className="mx-6 text-left">
            <ShieldAlert />
            <AlertDescription>
              Check the link and try again, or ask your administrator for a new invitation.
            </AlertDescription>
          </Alert>
        )}
      </Card>
    </div>
  );
}
