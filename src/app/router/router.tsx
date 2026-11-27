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
import { LedgersPage } from '@/pages/books/LedgersPage';
import { PaymentsPage } from '@/pages/books/PaymentsPage';
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
import { AppShell } from './AppShell';

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
