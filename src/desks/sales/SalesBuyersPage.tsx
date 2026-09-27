import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

// Live filter pattern for whoever wires real data here:
// const [q, setQ] = useState('');
// const filtered = useMemo(() => items.filter(b => matches(b, q)), [items, q]);
// <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firm, GSTIN, mobile, tehsil…" />
// (as-you-type, no submit button — unlike EnquiriesPage's search box, which
// is submit-triggered; these lists are small enough that no debounce is needed.)

/** Placeholder — the `/staff/sales/buyers` endpoint is being built in parallel (Work-stream A). */
export function SalesBuyersPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Buyers</h1>
        <Button onClick={() => navigate('/sales/buyers/new')}>Register a buyer</Button>
      </div>
      <Card>
        <p className="text-sm text-slate-500">Wired to real data in the next pass.</p>
      </Card>
    </div>
  );
}
