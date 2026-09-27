import { Card } from '../../components/ui/Card';

/** Placeholder — the `/staff/sales/orders` endpoint is being built in parallel (Work-stream A). */
export function SalesOrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Orders</h1>
      <Card>
        <p className="text-sm text-slate-500">Wired to real data in the next pass.</p>
      </Card>
    </div>
  );
}
