import { Outlet } from 'react-router-dom';
import { PurchaseNav } from './PurchaseNav';

/** The shell every `/purchase/*` route renders inside — the sub-nav, then the page. */
export function PurchaseLayout() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Purchase</h1>
      <PurchaseNav />
      <Outlet />
    </div>
  );
}
