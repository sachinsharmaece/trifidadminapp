import { Outlet } from 'react-router-dom';
import { SalesNav } from './SalesNav';

/** The shell every `/sales/*` route renders inside — the sub-nav, then the page. */
export function SalesLayout() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Sales</h1>
      <SalesNav />
      <Outlet />
    </div>
  );
}
