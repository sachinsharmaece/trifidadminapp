import { useState } from 'react';
import { Link } from 'react-router';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';

interface SellLeadRow {
  id: string;
  firm: { name: string; tehsil: { name: string } };
  productText: string;
  status: string;
  owner: string | null;
  createdAt: string;
  pastSla: boolean;
}

/** Purchase → Seller leads, as the reference (app/(purchase)/seller-leads): newest first, owner, status, SLA. */
export function SellerLeadsPage() {
  useDocumentTitle('Seller leads');
  const [leads, setLeads] = useState<SellLeadRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  useOnMount(async () => {
    const data = await refGet<{ sellLeads: SellLeadRow[] }>('/sell-leads');
    setLeads(data.sellLeads ?? []);
    setLoaded(true);
  });

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Seller leads</h1>
        <Link to="/seller-leads/new" className="rounded bg-zinc-900 px-3 py-2 text-sm text-white">
          Add seller lead
        </Link>
      </div>
      {loaded && leads.length === 0 && (
        <p className="text-sm text-zinc-400">No seller leads yet.</p>
      )}
      <div className="flex flex-col divide-y divide-zinc-100 rounded border border-zinc-200">
        {leads.map((lead) => (
          <Link
            key={lead.id}
            to={`/seller-leads/${lead.id}`}
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-zinc-50"
            data-testid="lead-row"
          >
            <div>
              <p className="font-medium text-zinc-900">
                {lead.firm.name} — {lead.productText}
              </p>
              <p className="text-xs text-zinc-500">
                {lead.firm.tehsil.name} · owner: {lead.owner ?? 'unclaimed'} ·{' '}
                {formatDateIST(lead.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {lead.pastSla && (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                  Past SLA
                </span>
              )}
              <span className="rounded-full border border-zinc-300 px-2 py-1 text-xs text-zinc-700">
                {lead.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
