import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { AppShell } from '../components/AppShell';
import { TeamPage } from '../desks/admin/TeamPage';
import { MastersPage } from '../desks/admin/MastersPage';
import { RegistrationsPage } from '../desks/admin/RegistrationsPage';
import { ChainDeskPage } from '../desks/chain/ChainDeskPage';
import { AccountsDeskPage } from '../desks/accounts/AccountsDeskPage';
import { MargDeskPage } from '../desks/marg/MargDeskPage';
import { DockDeskPage } from '../desks/dock/DockDeskPage';
import { RegistersPage } from '../desks/registers/RegistersPage';
import { PurchaseDeskPage } from '../desks/purchase/PurchaseDeskPage';
import { SalesDeskPage } from '../desks/sales/SalesDeskPage';
import { LogisticsDeskPage } from '../desks/logistics/LogisticsDeskPage';
import { ControllerDeskPage } from '../desks/controller/ControllerDeskPage';
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
              <AppShell>
                <TeamPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/masters"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <AppShell>
                <MastersPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/registrations"
          element={
            <RequireAuth permission={PERMISSIONS.ONBOARDING_READ}>
              <AppShell>
                <RegistrationsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/chain"
          element={
            <RequireAuth permission={PERMISSIONS.CHAIN_READ}>
              <AppShell>
                <ChainDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/accounts"
          element={
            <RequireAuth permission={PERMISSIONS.RECEIPT_READ}>
              <AppShell>
                <AccountsDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/marg"
          element={
            <RequireAuth permission={PERMISSIONS.MARG_KEY}>
              <AppShell>
                <MargDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/dock"
          element={
            <RequireAuth permission={PERMISSIONS.DOCK_INSPECT}>
              <AppShell>
                <DockDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/purchase"
          element={
            <RequireAuth permission={PERMISSIONS.DEMAND_READ}>
              <AppShell>
                <PurchaseDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/sales"
          element={
            <RequireAuth permission={PERMISSIONS.CHAIN_READ}>
              <AppShell>
                <SalesDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/registers"
          element={
            <RequireAuth permission={PERMISSIONS.REGISTER_READ}>
              <AppShell>
                <RegistersPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/logistics"
          element={
            <RequireAuth permission={PERMISSIONS.LOGISTICS_READ}>
              <AppShell>
                <LogisticsDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/controller"
          element={
            <RequireAuth permission={PERMISSIONS.EXCEPTION_READ}>
              <AppShell>
                <ControllerDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
