import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPilesAwaitingDecision,
  postPileChase,
  type PileAwaitingDecisionItem,
} from '../../api/purchase';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';
import { PileDecisionForm } from './PileDecisionForm';

/** Confirmations — buyer demand piling on one seller's listing (BR-133/BR-135). */
export function ConfirmationsPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getPilesAwaitingDecision(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_confirmations" />
      <Card title="Waiting on a seller's decision">
        <p className="mb-4 text-sm text-slate-500">
          He answers once and it covers every buyer on the pile. If he declines, re-source it from
          the Supply matrix.
        </p>
        <p className="mb-4 rounded-md border border-warning-500/30 bg-warning-50 p-3 text-sm text-warning-700">
          <strong>Counsel item still owed.</strong> Any board that puts competing sellers' live
          prices in each other's hands through us is a Competition Act §3(3) question, and it goes
          to the lawyer before this runs in production.
        </p>
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing piling right now.">
          {(items: PileAwaitingDecisionItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Seller · Product</Th>
                  <Th numeric>Boxes</Th>
                  <Th numeric>Buyers</Th>
                  <Th numeric>Rate</Th>
                  <Th>Gap</Th>
                  <Th numeric>Chase in</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <PileRow key={item.pileId} item={item} onDecided={retry} />
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

function PileRow({ item, onDecided }: { item: PileAwaitingDecisionItem; onDecided: () => void }) {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [chased, setChased] = useState(false);

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <Td>
          {open ? '▾ ' : '▸ '}
          <span className="font-medium">{item.sellerFirm}</span>
          <span className="text-slate-500">
            {' '}
            · {item.brand} {item.packLabel}
          </span>
        </Td>
        <Td numeric>{item.boxes}</Td>
        <Td numeric>{item.buyers}</Td>
        <Td numeric>₹{(item.ratePaise / 100).toFixed(2)}</Td>
        <Td>
          {item.gapText ? (
            <span className="text-danger-500 font-medium">{item.gapText}</span>
          ) : (
            <span className="text-slate-500">covers it</span>
          )}
        </Td>
        <Td numeric className={item.chaseLeftHours <= 3 ? 'text-danger-500 font-semibold' : ''}>
          {item.chaseLeftHours}h
        </Td>
        <Td onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                void callApi((token) => postPileChase(token, item.pileId)).then(() =>
                  setChased(true),
                )
              }
            >
              {chased ? 'Chased' : 'Chase'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/purchase/matrix?q=${encodeURIComponent(item.brand)}`)}
            >
              Re-source
            </Button>
          </div>
        </Td>
      </tr>
      {open && (
        <tr onClick={(e) => e.stopPropagation()}>
          <Td colSpan={7}>
            <PileDecisionForm
              pileId={item.pileId}
              sellerCounterpartyId={item.sellerCounterpartyId}
              boxes={item.boxes}
              onDecided={onDecided}
            />
          </Td>
        </tr>
      )}
    </>
  );
}
