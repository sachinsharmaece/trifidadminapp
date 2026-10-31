import { Outlet } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { PurchaseNav } from './PurchaseNav';

/** The shell every `/purchase/*` route renders inside — the sub-nav, then the page. */
export function PurchaseLayout() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Purchase" />
      <PurchaseNav />
      <Outlet />
    </div>
  );
}
