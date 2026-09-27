import { useParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';

/** Placeholder — the pool detail endpoint is being built in parallel (Work-stream A). */
export function SalesPoolDetailPage() {
  const { poolId } = useParams<{ poolId: string }>();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Pools</h1>
      <Card>
        <p className="text-sm text-slate-500">
          Wired to real data in the next pass{poolId ? ` — pool ${poolId}` : ''}.
        </p>
      </Card>
    </div>
  );
}
