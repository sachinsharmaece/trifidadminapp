import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { LoginPage } from '../auth/LoginPage';
import { RequireAuth } from '../auth/RequireAuth';
import { AppShell } from '../components/AppShell';
import { TeamPage } from '../desks/admin/TeamPage';
import { ProductsPage } from '../desks/admin/ProductsPage';
import { ProductCreatePage } from '../desks/admin/ProductCreatePage';
import { ProductDetailPage } from '../desks/admin/ProductDetailPage';
import { ManufacturersPage } from '../desks/admin/ManufacturersPage';
import { TehsilsPage } from '../desks/admin/TehsilsPage';
import { RegistrationsPage } from '../desks/admin/RegistrationsPage';
import { ChainDeskPage } from '../desks/chain/ChainDeskPage';
import { AccountsDeskPage } from '../desks/accounts/AccountsDeskPage';
import { MargDeskPage } from '../desks/marg/MargDeskPage';
import { DockDeskPage } from '../desks/dock/DockDeskPage';
import { RegistersPage } from '../desks/registers/RegistersPage';
import { PurchaseLayout } from '../desks/purchase/PurchaseLayout';
import { TodayPage } from '../desks/purchase/TodayPage';
import { DemandPage } from '../desks/purchase/DemandPage';
import { ConfirmationsPage } from '../desks/purchase/ConfirmationsPage';
import { DispatchPage } from '../desks/purchase/DispatchPage';
import { SellersPage } from '../desks/purchase/SellersPage';
import { SellerFilePage } from '../desks/purchase/SellerFilePage';
import { AddSellerPage } from '../desks/purchase/AddSellerPage';
import { AddCatalogueEntryPage } from '../desks/purchase/AddCatalogueEntryPage';
import { EnterListingPage } from '../desks/purchase/EnterListingPage';
import { SupplyMatrixPage } from '../desks/purchase/SupplyMatrixPage';
import { RecoveryPage } from '../desks/purchase/RecoveryPage';
import { PurchaseProductsPage } from '../desks/purchase/PurchaseProductsPage';
import { SalesDeskPage } from '../desks/sales/SalesDeskPage';
import { LogisticsDeskPage } from '../desks/logistics/LogisticsDeskPage';
import { ControllerDeskPage } from '../desks/controller/ControllerDeskPage';
import { NotificationLogPage } from '../desks/notifications/NotificationLogPage';
import { FounderDeskPage } from '../desks/founder/FounderDeskPage';
import { EnquiriesPage } from '../desks/enquiries/EnquiriesPage';
import { EnquiryDetailPage } from '../desks/enquiries/EnquiryDetailPage';
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
          path="/manage/products"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <AppShell>
                <ProductsPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/manage/products/new"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <AppShell>
                <ProductCreatePage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/manage/products/:productId"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <AppShell>
                <ProductDetailPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/manage/manufacturers"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <AppShell>
                <ManufacturersPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/manage/tehsils"
          element={
            <RequireAuth permission={PERMISSIONS.CATALOG_WRITE}>
              <AppShell>
                <TehsilsPage />
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
          path="/enquiries"
          element={
            <RequireAuth permission={PERMISSIONS.CHAIN_READ}>
              <AppShell>
                <EnquiriesPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/enquiries/:id"
          element={
            <RequireAuth permission={PERMISSIONS.CHAIN_READ}>
              <AppShell>
                <EnquiryDetailPage />
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
                <PurchaseLayout />
              </AppShell>
            </RequireAuth>
          }
        >
          <Route index element={<TodayPage />} />
          <Route path="demand" element={<DemandPage />} />
          <Route path="confirmations" element={<ConfirmationsPage />} />
          <Route path="dispatch" element={<DispatchPage />} />
          <Route path="sellers" element={<SellersPage />} />
          <Route path="add-seller" element={<AddSellerPage />} />
          <Route path="sellers/:id" element={<SellerFilePage />} />
          <Route path="sellers/:id/catalogue/new" element={<AddCatalogueEntryPage />} />
          <Route path="sellers/:id/listing/new" element={<EnterListingPage />} />
          <Route path="matrix" element={<SupplyMatrixPage />} />
          <Route path="recovery" element={<RecoveryPage />} />
          <Route path="products" element={<PurchaseProductsPage />} />
        </Route>
        <Route
          path="/sales"
          element={
            <RequireAuth permission={PERMISSIONS.SALES_WORKLIST_READ}>
              <AppShell>
                <SalesDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/registers"
          element={
            <RequireAuth
              permission={[PERMISSIONS.REGISTER_SALES_READ, PERMISSIONS.REGISTER_PURCHASE_READ]}
            >
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
        <Route
          path="/notifications"
          element={
            <RequireAuth permission={PERMISSIONS.NOTIFICATION_LOG_READ}>
              <AppShell>
                <NotificationLogPage />
              </AppShell>
            </RequireAuth>
          }
        />
        <Route
          path="/founder"
          element={
            <RequireAuth permission={PERMISSIONS.FOUNDER_OVERVIEW_READ}>
              <AppShell>
                <FounderDeskPage />
              </AppShell>
            </RequireAuth>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
