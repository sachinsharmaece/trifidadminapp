import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { EmployeesListPage } from '../desks/admin/EmployeesListPage';
import { PERMISSIONS } from '../lib/permissions';

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <RequireAuth permission={PERMISSIONS.EMPLOYEE_READ}>
              <EmployeesListPage />
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
