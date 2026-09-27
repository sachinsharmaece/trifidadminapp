import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';

/** Placeholder — the `/staff/sales/buyers/:id` endpoint is being built in parallel (Work-stream A). */
export function SalesBuyerFilePage() {
  const { buyerId } = useParams<{ buyerId: string }>();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Buyers</h1>
      <Card>
        <p className="text-sm text-slate-500">
          Wired to real data in the next pass{buyerId ? ` — buyer ${buyerId}` : ''}.
        </p>
      </Card>
    </div>
  );
}
