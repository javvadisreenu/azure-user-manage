import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { getApi } from "@/apiClient";
import { SessionContext } from "@/context/SessionContext";
import { SidebarBrand, SidebarNav } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "sidebarCollapsed";

/**
 * Authenticated app layout: sidebar + header + scrollable body + footer.
 * Resolves session state (/api/me + org list) and provides it via context.
 */
export function AppShell({ activeOrgId, onSelectOrg, onClearOrg, children }) {
  const { instance, accounts } = useMsal();
  const location = useLocation();

  const [me, setMe] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "1"
  );
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const account = accounts[0];

  const loadSession = useCallback(() => {
    if (!account || !activeOrgId) return;
    getApi(instance, account, "/api/me", activeOrgId)
      .then((res) => setMe(res.data))
      .catch((err) => {
        const status = err.response?.status;
        // Active org is no longer valid (membership removed / suspended) —
        // fall back to the org selector instead of an error page.
        if (status === 403 || status === 409) onClearOrg();
      });
    getApi(instance, account, "/api/tenant-selector", activeOrgId)
      .then((res) => setOrgs(res.data))
      .catch(() => {});
  }, [instance, account, activeOrgId, onClearOrg]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      localStorage.setItem(SIDEBAR_KEY, c ? "0" : "1");
      return !c;
    });
  }, []);

  const session = useMemo(
    () => ({
      me,
      orgs,
      roles: me?.tenant?.roles ?? [],
      tenantName: me?.tenant?.organizationName,
      orgCode: me?.tenant?.organizationCode,
      activeOrgId,
      selectOrg: onSelectOrg,
      clearOrg: onClearOrg,
      refresh: loadSession,
    }),
    [me, orgs, activeOrgId, onSelectOrg, onClearOrg, loadSession]
  );

  return (
    <SessionContext.Provider value={session}>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "bg-sidebar hidden shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
            collapsed ? "w-16" : "w-64"
          )}
        >
          <SidebarBrand collapsed={collapsed} />
          <div className="flex-1 overflow-y-auto py-4">
            <SidebarNav collapsed={collapsed} />
          </div>
          <div className="border-t p-2.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className="text-muted-foreground w-full justify-start gap-2.5"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <>
                  <PanelLeftClose className="size-4" /> Collapse
                </>
              )}
            </Button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onOpenMobileNav={() => setMobileNavOpen(true)} />

          <main key={location.pathname} className="animate-in fade-in slide-in-from-bottom-1 flex-1 overflow-y-auto duration-300">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
          </main>

          <Footer />
        </div>

        {/* Mobile navigation drawer */}
        <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <DialogContent className="top-4 left-4 max-h-[calc(100vh-2rem)] w-72 translate-x-0 translate-y-0 gap-0 overflow-y-auto p-0 sm:max-w-72" showClose={false}>
            <DialogTitle className="sr-only">Navigation</DialogTitle>
            <SidebarBrand />
            <div className="py-4 pb-6">
              <SidebarNav onNavigate={() => setMobileNavOpen(false)} />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SessionContext.Provider>
  );
}
