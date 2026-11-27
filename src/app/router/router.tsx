import { createBrowserRouter } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RateBoardPage } from '@/pages/board/RateBoardPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { ListingsPage } from '@/pages/listings/ListingsPage';
import { CompanyPage } from '@/pages/masters/CompanyPage';
import { HsnCodesPage } from '@/pages/masters/HsnCodesPage';
import { MarginMatrixPage } from '@/pages/masters/MarginMatrixPage';
import { ManufacturersPage } from '@/pages/masters/ManufacturersPage';
import { ReasonCodesPage } from '@/pages/masters/ReasonCodesPage';
import { TechnicalsPage } from '@/pages/masters/TechnicalsPage';
import { TehsilsPage } from '@/pages/masters/TehsilsPage';
import { BuyersPage } from '@/pages/parties/BuyersPage';
import { SellersPage } from '@/pages/parties/SellersPage';
import { NewProductPage } from '@/pages/products/NewProductPage';
import { ProductPage } from '@/pages/products/ProductPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { StaffPage } from '@/pages/staff/StaffPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
import { BuyerFunnelsPage } from '@/pages/trades/BuyerFunnelsPage';
import { SellerFunnelsPage } from '@/pages/trades/SellerFunnelsPage';
import { BankAccountsPage } from '@/pages/books/BankAccountsPage';
import { LedgerPage } from '@/pages/books/LedgerPage';
import { BankReconciliationPage } from '@/pages/books/BankReconciliationPage';
import { JournalsPage } from '@/pages/books/JournalsPage';
import { LedgersPage } from '@/pages/books/LedgersPage';
import { PaymentsPage } from '@/pages/books/PaymentsPage';
import { VouchersPage } from '@/pages/books/VouchersPage';
import { DockPage } from '@/pages/dock/DockPage';
import { ReturnNotesPage } from '@/pages/dock/ReturnNotesPage';
import { PayoutsPage } from '@/pages/books/PayoutsPage';
import { ToBeBilledPage } from '@/pages/books/ToBeBilledPage';
import { TripsPage } from '@/pages/trips/TripsPage';
import { PurchaseOrderPage } from '@/pages/purchaseOrders/PurchaseOrderPage';
import { PurchaseOrdersPage } from '@/pages/purchaseOrders/PurchaseOrdersPage';
import { SalesOrderPage } from '@/pages/salesOrders/SalesOrderPage';
import { SalesOrdersPage } from '@/pages/salesOrders/SalesOrdersPage';
import { ComplaintsPage } from '@/pages/complaints/ComplaintsPage';
import { IntegrityPage } from '@/pages/reports/IntegrityPage';
import { PurchaseRegisterPage } from '@/pages/reports/PurchaseRegisterPage';
import { SalesRegisterPage } from '@/pages/reports/SalesRegisterPage';
import { TrialBalancePage } from '@/pages/reports/TrialBalancePage';
import { TodayPage } from '@/pages/today/TodayPage';
import { TradePage } from '@/pages/trades/TradePage';
import { ComingSoonPage } from '@/pages/ComingSoonPage';
import { BankAccountsPage as RefBankAccountsPage } from '@/pages/ref/masters/BankAccountsPage';
import { CompanyPage as RefCompanyPage } from '@/pages/ref/masters/CompanyPage';
import { HsnPage as RefHsnPage } from '@/pages/ref/masters/HsnPage';
import { ManufacturersPage as RefManufacturersPage } from '@/pages/ref/masters/ManufacturersPage';
import { MarginMatrixPage as RefMarginMatrixPage } from '@/pages/ref/masters/MarginMatrixPage';
import { ProductsPage as RefProductsPage } from '@/pages/ref/masters/ProductsPage';
import { ReasonCodesPage as RefReasonCodesPage } from '@/pages/ref/masters/ReasonCodesPage';
import { SettingsPage as RefSettingsPage } from '@/pages/ref/masters/SettingsPage';
import { StaffPage as RefStaffPage } from '@/pages/ref/masters/StaffPage';
import { TechnicalsPage as RefTechnicalsPage } from '@/pages/ref/masters/TechnicalsPage';
import { TehsilsPage as RefTehsilsPage } from '@/pages/ref/masters/TehsilsPage';
import { AppShell } from './AppShell';

/** A page from the reference that a later build (R2–R10) copies; until then it says so. */
const soon = (title: string, build: string) => <ComingSoonPage title={title} build={build} />;

/** Every route of the app. Menu entries are configured separately in app/navigation.ts. */
export const router = createBrowserRouter([
  {
    // Catches anything that goes wrong outside the app frame (e.g. the login page).
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        // Everything below needs a signed-in user; anyone else is sent to /login.
        element: <RequireAuth />,
        children: [
          // Outside the app frame, so a person on a temporary password sees only this page.
          { path: '/change-password', element: <ChangePasswordPage /> },
          {
            element: <AppShell />,
            children: [
              {
                // Errors inside a page show here, *inside* the shell, so the menu keeps working.
                errorElement: <RouteErrorPage />,
                children: [
                  { index: true, element: <DashboardPage /> },
                  // ---- Reference paths (reference-copy branch) ----
                  { path: '/dashboard', element: <DashboardPage /> },
                  { path: '/settings', element: <RefSettingsPage /> },
                  { path: '/masters/company', element: <RefCompanyPage /> },
                  { path: '/masters/products', element: <RefProductsPage /> },
                  { path: '/masters/margin-matrix', element: <RefMarginMatrixPage /> },
                  { path: '/masters/sku-margins', element: soon('SKU price matrix', 'R8') },
                  { path: '/masters/tehsils', element: <RefTehsilsPage /> },
                  { path: '/masters/manufacturers', element: <RefManufacturersPage /> },
                  { path: '/masters/technicals', element: <RefTechnicalsPage /> },
                  { path: '/masters/hsn', element: <RefHsnPage /> },
                  { path: '/masters/reason-codes', element: <RefReasonCodesPage /> },
                  { path: '/masters/bank-accounts', element: <RefBankAccountsPage /> },
                  { path: '/masters/staff', element: <RefStaffPage /> },
                  // Desk pages: our existing screen where one already does the job; the rest come in later builds.
                  { path: '/controller-today', element: <TodayPage /> },
                  { path: '/listings/new', element: <ListingsPage /> },
                  { path: '/call-screen', element: <RateBoardPage /> },
                  { path: '/dispatch-leg2', element: <TripsPage /> },
                  { path: '/upcoming-payments', element: <PaymentsPage /> },
                  { path: '/ledger', element: <LedgersPage /> },
                  { path: '/payment', element: <PayoutsPage /> },
                  { path: '/journal', element: <JournalsPage /> },
                  { path: '/ledger-master', element: <LedgersPage /> },
                  { path: '/purchase-today', element: soon('Purchase — Today', 'R2') },
                  { path: '/confirmations', element: soon('Confirmations', 'R2') },
                  { path: '/seller-leads', element: soon('Seller leads', 'R8') },
                  { path: '/asks', element: soon('Asks', 'R3') },
                  { path: '/goods-in', element: soon('Goods-in', 'R5') },
                  { path: '/inspection', element: soon('Inspection', 'R5') },
                  { path: '/logistics-trade-queue', element: soon('Trade queue', 'R5') },
                  { path: '/vehicle-owners', element: soon('Vehicle owners', 'R5') },
                  { path: '/accounts-today', element: soon('Accounts — Today', 'R6') },
                  { path: '/credit-log', element: soon('Credit log', 'R7') },
                  // ---- Older paths, still reachable ----
                  { path: '/buyers', element: <BuyersPage /> },
                  { path: '/sellers', element: <SellersPage /> },
                  { path: '/listings', element: <ListingsPage /> },
                  { path: '/rate-board', element: <RateBoardPage /> },
                  { path: '/buyer-funnels', element: <BuyerFunnelsPage /> },
                  { path: '/seller-funnels', element: <SellerFunnelsPage /> },
                  { path: '/trades/:id', element: <TradePage /> },
                  { path: '/sales-orders', element: <SalesOrdersPage /> },
                  { path: '/sales-orders/:id', element: <SalesOrderPage /> },
                  { path: '/complaints', element: <ComplaintsPage /> },
                  { path: '/today', element: <TodayPage /> },
                  { path: '/payments', element: <PaymentsPage /> },
                  { path: '/purchase-orders', element: <PurchaseOrdersPage /> },
                  { path: '/purchase-orders/:id', element: <PurchaseOrderPage /> },
                  { path: '/dock', element: <DockPage /> },
                  { path: '/return-notes', element: <ReturnNotesPage /> },
                  { path: '/to-be-billed', element: <ToBeBilledPage /> },
                  { path: '/payouts', element: <PayoutsPage /> },
                  { path: '/trips', element: <TripsPage /> },
                  { path: '/ledgers', element: <LedgersPage /> },
                  { path: '/ledgers/:id', element: <LedgerPage /> },
                  { path: '/bank-accounts', element: <BankAccountsPage /> },
                  { path: '/journals', element: <JournalsPage /> },
                  { path: '/vouchers', element: <VouchersPage /> },
                  { path: '/bank-reconciliation', element: <BankReconciliationPage /> },
                  { path: '/reports/sales-register', element: <SalesRegisterPage /> },
                  { path: '/reports/purchase-register', element: <PurchaseRegisterPage /> },
                  { path: '/reports/trial-balance', element: <TrialBalancePage /> },
                  { path: '/integrity', element: <IntegrityPage /> },
                  { path: '/products', element: <ProductsPage /> },
                  { path: '/products/new', element: <NewProductPage /> },
                  { path: '/products/:id', element: <ProductPage /> },
                  { path: '/manufacturers', element: <ManufacturersPage /> },
                  { path: '/margin-matrix', element: <MarginMatrixPage /> },
                  { path: '/technicals', element: <TechnicalsPage /> },
                  { path: '/hsn-codes', element: <HsnCodesPage /> },
                  { path: '/tehsils', element: <TehsilsPage /> },
                  { path: '/reason-codes', element: <ReasonCodesPage /> },
                  { path: '/company', element: <CompanyPage /> },
                  { path: '/staff', element: <StaffPage /> },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]);
