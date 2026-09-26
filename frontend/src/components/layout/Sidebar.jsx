import { Link, useLocation } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import {
  Building2,
  IdCard,
  LayoutDashboard,
  MailPlus,
  ScrollText,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

export function navItems(roles) {
  const isPlatformAdmin = roles.includes("PlatformAdmin");
  const isAdmin = isPlatformAdmin || roles.includes("TenantAdmin");
  return [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true, section: "Platform" },
    { to: "/profile", label: "Profile", icon: UserRound, show: true, section: "Platform" },
    { to: "/members", label: "Members", icon: Users, show: isAdmin, section: "Administration" },
    { to: "/invitations", label: "Invitations", icon: MailPlus, show: isAdmin, section: "Administration" },
    { to: "/audit", label: "Audit Log", icon: ScrollText, show: isAdmin, section: "Administration" },
    { to: "/organizations", label: "Organizations", icon: Building2, show: isPlatformAdmin, section: "Platform Admin" },
    { to: "/users", label: "User Directory", icon: IdCard, show: isPlatformAdmin, section: "Platform Admin" },
  ];
}

export function SidebarBrand({ collapsed = false }) {
  return (
    <div className={cn("flex h-14 shrink-0 items-center gap-2.5 px-5", collapsed && "justify-center px-0")}>
      <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm">
        <ShieldCheck className="size-4" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">SaaS Console</p>
          <p className="text-muted-foreground text-[11px]">Identity &amp; Access</p>
        </div>
      )}
    </div>
  );
}

/**
 * Shared sidebar navigation — rendered in the desktop rail and the mobile drawer.
 */
export function SidebarNav({ collapsed = false, onNavigate }) {
  const { roles } = useSession();
  const location = useLocation();
  const items = navItems(roles).filter((i) => i.show);

  const sections = [...new Set(items.map((i) => i.section))];

  return (
    <nav className={cn("flex flex-col gap-6 px-3", collapsed && "px-2.5")}>
      {sections.map((section) => (
        <div key={section}>
          {!collapsed && (
            <p className="text-muted-foreground/60 mb-2 px-2.5 text-[11px] font-semibold uppercase tracking-widest">
              {section}
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {items
              .filter((i) => i.section === section)
              .map((item) => {
                const active =
                  item.to === "/dashboard"
                    ? location.pathname === "/" || location.pathname === "/dashboard"
                    : location.pathname.startsWith(item.to);
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors outline-none",
                        collapsed && "justify-center px-0",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_1px_0_0_oklch(1_0_0/0.04)]"
                          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {active && (
                        <span className="bg-primary absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full" />
                      )}
                      <Icon className="size-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
