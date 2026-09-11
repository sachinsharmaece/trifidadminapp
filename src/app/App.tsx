import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { TeamPage } from '../desks/admin/TeamPage';
import { MastersPage } from '../desks/admin/MastersPage';
import { RegistrationsPage } from '../desks/admin/RegistrationsPage';
import { ChainDeskPage } from '../desks/chain/ChainDeskPage';
import { AccountsDeskPage } from '../desks/accounts/AccountsDeskPage';
import { MargDeskPage } from '../desks/marg/MargDeskPage';
import { DockDeskPage } from '../desks/dock/DockDeskPage';
import { RegistersPage } from '../desks/registers/RegistersPage';
import { PERMISSIONS } from '../lib/permissions';

function Nav() {
  const { logout } = useAuth();
  return (
    <nav className="app-nav">
      <Link to="/">Team</Link>
      <Link to="/masters">Masters</Link>
      <Link to="/registrations">Registrations</Link>
      <Link to="/chain">Trade chain</Link>
      <Link to="/accounts">Accounts</Link>
      <Link to="/marg">Marg</Link>
      <Link to="/dock">Dock &amp; movements</Link>
      <Link to="/registers">Registers</Link>
      <button type="button" onClick={() => void logout()}>
        Sign out
      </button>
    </nav>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth permission={PERMISSIONS.EMPLOYEE_READ}>
              <Nav />
              <TeamPage />
            </RequireAuth>
          }
        />
        <Route
          path="/masters"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <Nav />
              <MastersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/registrations"
          element={
            <RequireAuth permission={PERMISSIONS.ONBOARDING_READ}>
              <Nav />
              <RegistrationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/chain"
          element={
            <RequireAuth permission={PERMISSIONS.CHAIN_READ}>
              <Nav />
              <ChainDeskPage />
            </RequireAuth>
          }
        />
        <Route
          path="/accounts"
          element={
            <RequireAuth permission={PERMISSIONS.RECEIPT_READ}>
              <Nav />
              <AccountsDeskPage />
            </RequireAuth>
          }
        />
        <Route
          path="/marg"
          element={
            <RequireAuth permission={PERMISSIONS.MARG_KEY}>
              <Nav />
              <MargDeskPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dock"
          element={
            <RequireAuth permission={PERMISSIONS.DOCK_INSPECT}>
              <Nav />
              <DockDeskPage />
            </RequireAuth>
          }
        />
        <Route
          path="/registers"
          element={
            <RequireAuth permission={PERMISSIONS.REGISTER_READ}>
              <Nav />
              <RegistersPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
