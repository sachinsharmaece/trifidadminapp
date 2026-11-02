import { Outlet } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { SalesNav } from './SalesNav';

/** The shell every `/sales/*` route renders inside — the sub-nav, then the page. */
export function SalesLayout() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Sales" />
      <SalesNav />
      <Outlet />
    </div>
  );
}
