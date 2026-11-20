import { createBrowserRouter } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ChangePasswordPage } from '@/pages/auth/ChangePasswordPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { CompanyPage } from '@/pages/masters/CompanyPage';
import { HsnCodesPage } from '@/pages/masters/HsnCodesPage';
import { ManufacturersPage } from '@/pages/masters/ManufacturersPage';
import { ReasonCodesPage } from '@/pages/masters/ReasonCodesPage';
import { TechnicalsPage } from '@/pages/masters/TechnicalsPage';
import { TehsilsPage } from '@/pages/masters/TehsilsPage';
import { NewProductPage } from '@/pages/products/NewProductPage';
import { ProductPage } from '@/pages/products/ProductPage';
import { ProductsPage } from '@/pages/products/ProductsPage';
import { StaffPage } from '@/pages/staff/StaffPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { RouteErrorPage } from '@/pages/RouteErrorPage';
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
                  { path: '/products', element: <ProductsPage /> },
                  { path: '/products/new', element: <NewProductPage /> },
                  { path: '/products/:id', element: <ProductPage /> },
                  { path: '/manufacturers', element: <ManufacturersPage /> },
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
