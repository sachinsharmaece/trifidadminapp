import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { BUYER_STAGE_LABELS, SELLER_STAGE_LABELS } from '@/types/trade';
import { dueText } from '@/utils/format';
import type { FunnelSide, TradeRow } from './api';
import { useFunnel } from './hooks';

const PAGE_SIZE = 25;

const SIDES = {
  buyer: {
    stages: BUYER_STAGE_LABELS,
    party: 'Buyer',
    searchPlaceholder: 'Search by trade no., buyer or product',
  },
  seller: {
    stages: SELLER_STAGE_LABELS,
    party: 'Seller',
    searchPlaceholder: 'Search by trade no., seller or product',
  },
} as const;

function stageOf(side: FunnelSide, row: TradeRow): string {
  if (side === 'buyer') return BUYER_STAGE_LABELS[row.buyerStage];
  return row.sellerStage ? SELLER_STAGE_LABELS[row.sellerStage] : '—';
}

/**
 * A funnel list: stage tabs with counts, search, and the trades (whoever must act soonest first). The buyer side
 * names buyers (Sales); the seller side names sellers (Purchase). The server sends only the right side's names.
 */
export function FunnelView({ side }: { side: FunnelSide }) {
  const config = SIDES[side];
  const [stage, setStage] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const funnel = useFunnel(side, { stage, q, page, pageSize: PAGE_SIZE });

  function chooseStage(next: string) {
    setStage(next);
    setPage(1);
  }

  const counts = funnel.data?.counts ?? {};
  const all = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Stages">
        <Button
          size="sm"
          variant={stage === '' ? 'primary' : 'secondary'}
          onClick={() => chooseStage('')}
          aria-pressed={stage === ''}
        >
          All ({all})
        </Button>
        {Object.entries(config.stages).map(([name, label]) => (
          <Button
            key={name}
            size="sm"
            variant={stage === name ? 'primary' : 'secondary'}
            onClick={() => chooseStage(name)}
            aria-pressed={stage === name}
          >
            {label} ({counts[name] ?? 0})
          </Button>
        ))}
      </div>
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder={config.searchPlaceholder}
        searchLabel="Search trades"
      />
      {funnel.isPending && <Spinner label="Loading trades" className="h-6 w-6 text-brand-600" />}
      {funnel.isError && (
        <ErrorState title="Could not load the trades" message={funnel.error.message}>
          <Button onClick={() => void funnel.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {funnel.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Trade</th>
                  <th className="px-4 py-3 font-medium">Stage</th>
                  <th className="px-4 py-3 font-medium">{config.party}</th>
                  <th className="px-4 py-3 font-medium">Product pack</th>
                  <th className="px-4 py-3 font-medium">Boxes</th>
                  <th className="px-4 py-3 font-medium">Next</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funnel.data.trades.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No trades here.
                    </td>
                  </tr>
                )}
                {funnel.data.trades.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <Link
                        to={`/trades/${row.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {row.number}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{stageOf(side, row)}</td>
                    <td className="px-4 py-3">
                      {row.party ? `${row.party.number} · ${row.party.firmName}` : 'Not chosen yet'}
                    </td>
                    <td className="px-4 py-3">
                      {row.productName}
                      {row.packLabel ? ` · ${row.packLabel}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{row.boxesWanted ?? '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {row.due ? (
                        <span
                          className={
                            new Date(row.due.at) < new Date()
                              ? 'font-medium text-red-700'
                              : 'text-slate-600'
                          }
                        >
                          {row.due.label} {dueText(row.due.at)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={funnel.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
