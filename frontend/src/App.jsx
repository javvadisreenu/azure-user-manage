import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useIsAuthenticated } from "@azure/msal-react";
import { AppShell } from "@/components/layout/AppShell";
import LandingPage from "@/pages/LandingPage";
import OrgSelector from "@/pages/OrgSelector";
import Dashboard from "@/pages/Dashboard";
import MembersPage from "@/pages/MembersPage";
import InvitationsPage from "@/pages/InvitationsPage";
import AcceptInvitePage from "@/pages/AcceptInvitePage";
import AuditPage from "@/pages/AuditPage";
import ProfilePage from "@/pages/ProfilePage";
import OrganizationsPage from "@/pages/OrganizationsPage";
import UsersPage from "@/pages/UsersPage";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const [activeOrgId, setActiveOrgId] = useState(() => sessionStorage.getItem("activeOrgId"));

  function selectOrg(orgId) {
    if (orgId) {
      sessionStorage.setItem("activeOrgId", orgId);
    } else {
      // Clearing the org (Switch Org) — remove the key entirely so a reload
      // doesn't read back the literal string "null".
      sessionStorage.removeItem("activeOrgId");
    }
    setActiveOrgId(orgId);
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    );
  }

  // Authenticated but no organization selected yet — show the picker.
  if (!activeOrgId) {
    return (
      <Routes>
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="*" element={<OrgSelector onSelect={selectOrg} />} />
      </Routes>
    );
  }

  return (
    <AppShell activeOrgId={activeOrgId} onSelectOrg={selectOrg} onClearOrg={() => selectOrg(null)}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard activeOrgId={activeOrgId} />} />
        <Route path="/members" element={<MembersPage activeOrgId={activeOrgId} />} />
        <Route path="/invitations" element={<InvitationsPage activeOrgId={activeOrgId} />} />
        <Route path="/audit" element={<AuditPage activeOrgId={activeOrgId} />} />
        <Route path="/profile" element={<ProfilePage activeOrgId={activeOrgId} />} />
        <Route path="/organizations" element={<OrganizationsPage activeOrgId={activeOrgId} />} />
        <Route path="/users" element={<UsersPage activeOrgId={activeOrgId} />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}
