import { useMsal } from "@azure/msal-react";
import { loginRequest, signUpRequest } from "@/authConfig";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Fingerprint,
  KeyRound,
  ScrollText,
  ShieldCheck,
  Users,
} from "lucide-react";

const FEATURES = [
  { icon: Fingerprint, title: "Entra External ID", text: "Passwordless-ready SSO with Microsoft Entra External ID (CIAM)." },
  { icon: Building2, title: "Multi-tenant", text: "Organizations, memberships and per-tenant isolation out of the box." },
  { icon: Users, title: "Roles & invitations", text: "Admins, managers and guest roles with expiring invite links." },
  { icon: ScrollText, title: "Full audit trail", text: "Every administrative action is recorded and reviewable." },
];

export default function LandingPage() {
  const { instance } = useMsal();

  function signIn() {
    instance.loginRedirect(loginRequest);
  }

  function signUp() {
    instance.loginRedirect(signUpRequest);
  }

  return (
    <div className="dot-grid flex min-h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-16 items-center justify-between px-6 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg shadow-sm">
            <ShieldCheck className="size-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight">SaaS Console</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={signIn}>Sign in</Button>
          <Button size="sm" onClick={signUp}>Create account</Button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <Badge variant="secondary" className="mb-6 gap-1.5 rounded-full px-3 py-1">
          <KeyRound className="size-3" />
          Multi-tenant identity platform
        </Badge>

        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance md:text-6xl md:leading-[1.08]">
          One secure console for{" "}
          <span className="bg-gradient-to-r from-sky-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            every organization
          </span>{" "}
          you run
        </h1>

        <p className="text-muted-foreground mt-5 max-w-xl text-base text-pretty md:text-lg">
          Manage users, roles, memberships and access across all of your tenants —
          powered by Microsoft Entra External ID.
        </p>

        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
          <Button size="lg" className="px-8 text-[15px]" onClick={signIn}>
            Sign in to your console
          </Button>
          <Button size="lg" variant="outline" className="px-8 text-[15px]" onClick={signUp}>
            Create an account
          </Button>
        </div>

        <p className="text-muted-foreground/70 mt-4 text-xs">
          Secured by Microsoft Entra External ID — no passwords stored in this app.
        </p>

        {/* Feature grid */}
        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-card/80 rounded-xl border p-5 shadow-xs backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="bg-primary/8 text-primary ring-primary/15 mb-3 flex size-9 items-center justify-center rounded-lg ring-1">
                <f.icon className="size-4.5" />
              </div>
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="text-muted-foreground mt-1 text-[13px] leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-muted-foreground/70 px-6 py-6 text-center text-xs">
        © 2026 SaaS Console · Built with React, Express and Microsoft Entra
      </footer>
    </div>
  );
}
