import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { useSession } from "@/context/SessionContext";
import { useTheme } from "@/hooks/useTheme";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  ChevronsUpDown,
  LogOut,
  Menu,
  Moon,
  Repeat,
  Sun,
  UserRound,
} from "lucide-react";

function initialsOf(name, email) {
  return (
    (name || email || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function Header({ onOpenMobileNav }) {
  const { instance } = useMsal();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { me, orgs, activeOrgId, selectOrg, clearOrg } = useSession();

  function signOut() {
    clearOrg();
    instance.logoutRedirect({ postLogoutRedirectUri: window.location.origin });
  }

  const user = me?.user;
  const roles = me?.tenant?.roles ?? [];
  const currentOrg = orgs.find((o) => o.organizationId === activeOrgId);

  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur md:px-6">
      {/* Mobile nav trigger */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="size-4.5" />
      </Button>

      {/* Organization switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2.5 px-2.5">
            <span className="bg-muted text-muted-foreground flex size-6 items-center justify-center rounded-md">
              <Building2 className="size-3.5" />
            </span>
            <span className="hidden max-w-40 truncate font-medium sm:inline">
              {currentOrg?.name ?? me?.tenant?.organizationName ?? "Organization"}
            </span>
            <ChevronsUpDown className="text-muted-foreground size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-muted-foreground text-[11px] font-semibold uppercase tracking-widest">
            Organizations
          </DropdownMenuLabel>
          {orgs.map((org) => (
            <DropdownMenuItem
              key={org.organizationId}
              onClick={() => selectOrg(org.organizationId)}
              className="gap-2.5"
            >
              <Building2 className="text-muted-foreground size-4 shrink-0" />
              <span className="flex-1 truncate">{org.name}</span>
              {org.organizationId === activeOrgId && (
                <Badge variant="success" className="pointer-events-none">Active</Badge>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/")}>
            <Repeat className="size-4" /> Switch organization…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1" />

      {/* Theme toggle */}
      <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === "dark" ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2.5 pl-1.5">
            <Avatar className="size-7">
              <AvatarFallback className="bg-primary text-primary-foreground text-[11px]">
                {initialsOf(user?.displayName, user?.primaryEmail)}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-36 truncate text-sm font-medium sm:inline">
              {user?.displayName || user?.primaryEmail || "Account"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{user?.displayName || "Signed in"}</p>
            <p className="text-muted-foreground truncate text-xs">{user?.primaryEmail}</p>
            {roles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <Badge key={r} variant={r === "PlatformAdmin" ? "danger" : "info"}>
                    {r}
                  </Badge>
                ))}
              </div>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/profile")}>
            <UserRound className="size-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
