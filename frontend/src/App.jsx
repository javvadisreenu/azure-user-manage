import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import Nav from "./components/Nav";
import LandingPage from "./pages/LandingPage";
import OrgSelector from "./pages/OrgSelector";
import Dashboard from "./pages/Dashboard";
import MembersPage from "./pages/MembersPage";
import InvitationsPage from "./pages/InvitationsPage";
import AcceptInvitePage from "./pages/AcceptInvitePage";
import AuditPage from "./pages/AuditPage";
import ProfilePage from "./pages/ProfilePage";
import OrganizationsPage from "./pages/OrganizationsPage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  const isAuthenticated = useIsAuthenticated();
  const [activeOrgId, setActiveOrgId] = useState(() => sessionStorage.getItem("activeOrgId"));

  function selectOrg(orgId) {
    sessionStorage.setItem("activeOrgId", orgId);
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

  return (
    <>
      <Nav activeOrgId={activeOrgId} onClearOrg={() => selectOrg(null)} />
      <Routes>
        <Route path="/" element={
          activeOrgId
            ? <Navigate to="/dashboard" replace />
            : <OrgSelector onSelect={selectOrg} />
        } />
        <Route path="/dashboard" element={
          activeOrgId ? <Dashboard activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/members" element={
          activeOrgId ? <MembersPage activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/invitations" element={
          activeOrgId ? <InvitationsPage activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/audit" element={
          activeOrgId ? <AuditPage activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/profile" element={
          activeOrgId ? <ProfilePage activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/organizations" element={
          activeOrgId ? <OrganizationsPage activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/users" element={
          activeOrgId ? <UsersPage activeOrgId={activeOrgId} /> : <Navigate to="/" replace />
        } />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
