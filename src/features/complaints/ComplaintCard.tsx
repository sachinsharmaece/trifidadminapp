import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { DecideForm } from '@/features/trades/complaintActionForms';
import type { ComplaintRow } from './api';
import { ComplaintLines } from './ComplaintLines';

/**
 * One complaint in the Controller's list: who, which order and trade, what was said and decided. An open one
 * has a "Resolve" button (for the Controller, Founder and Admin) that opens the same decision form as the deal card.
 */
export function ComplaintCard({ row, canDecide }: { row: ComplaintRow; canDecide: boolean }) {
  const [deciding, setDeciding] = useState(false);
  // Set when someone else decided or moved the trade first: the list reloads and shows what is now true.
  const [changedByOthers, setChangedByOthers] = useState(false);

  return (
    <li className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <span className="font-medium">
            {row.buyer.number} · {row.buyer.firmName}
          </span>
          <span className="text-slate-500">
            {' '}
            ·{' '}
            <Link
              to={`/sales-orders/${row.salesOrder.id}`}
              className="text-brand-700 hover:underline"
            >
              {row.salesOrder.number}
            </Link>{' '}
            ·{' '}
            <Link to={`/trades/${row.trade.id}`} className="text-brand-700 hover:underline">
              {row.trade.number}
            </Link>
          </span>
        </div>
        {canDecide && row.status === 'OPEN' && !deciding && (
          <Button
            onClick={() => {
              setChangedByOthers(false);
              setDeciding(true);
            }}
          >
            Resolve
          </Button>
        )}
      </div>
      <ComplaintLines complaints={[row]} />
      <ErrorAlert
        message={
          changedByOthers
            ? 'Someone else acted on this trade first, so your decision was not saved. The list now shows the latest.'
            : undefined
        }
      />
      {deciding && row.status === 'OPEN' && (
        <DecideForm
          key={row.trade.version}
          trade={row.trade}
          complaint={row}
          onDone={() => setDeciding(false)}
          onChangedByOthers={() => {
            setChangedByOthers(true);
            setDeciding(false);
          }}
        />
      )}
    </li>
  );
}
