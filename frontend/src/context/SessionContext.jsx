import { createContext, useContext } from "react";

// Session state resolved by AppShell: current user, active tenant, org list.
export const SessionContext = createContext(null);

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <AppShell>");
  return ctx;
}
