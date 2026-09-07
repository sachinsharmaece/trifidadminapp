import { Link, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { TeamPage } from '../desks/admin/TeamPage';
import { MastersPage } from '../desks/admin/MastersPage';
import { RegistrationsPage } from '../desks/admin/RegistrationsPage';
import { PERMISSIONS } from '../lib/permissions';

function Nav() {
  const { logout } = useAuth();
  return (
    <nav className="app-nav">
      <Link to="/">Team</Link>
      <Link to="/masters">Masters</Link>
      <Link to="/registrations">Registrations</Link>
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
      </Routes>
    </AuthProvider>
  );
}
