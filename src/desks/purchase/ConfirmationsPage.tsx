import { useCallback, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { getPilesAwaitingDecision, type PileAwaitingDecisionItem } from '../../api/purchase';
import { proxyConfirmPile, proxyRequotePile, proxyDeclinePile } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

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
        <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing piling right now.">
          {(items: PileAwaitingDecisionItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Pile</Th>
                  <Th>Boxes</Th>
                  <Th>Buyers</Th>
                  <Th>Rate</Th>
                  <Th>Chase in</Th>
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
  const [open, setOpen] = useState(false);
  const [canSendBoxes, setCanSendBoxes] = useState(item.boxes);
  const [expiryExact, setExpiryExact] = useState('');
  const [batch, setBatch] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setSubmitting(true);
    try {
      await action();
      onDecided();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not record this.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <tr className="cursor-pointer" onClick={() => setOpen((v) => !v)}>
        <Td>
          {open ? '▾ ' : '▸ '}
          {item.pileId.slice(-6)}
        </Td>
        <Td>{item.boxes}</Td>
        <Td>{item.buyers}</Td>
        <Td>₹{(item.ratePaise / 100).toFixed(2)}</Td>
        <Td className={item.chaseLeftHours <= 3 ? 'text-danger-500 font-semibold' : ''}>
          {item.chaseLeftHours}h
        </Td>
        <Td />
      </tr>
      {open && (
        <tr onClick={(e) => e.stopPropagation()}>
          <Td colSpan={6}>
            <div className="flex flex-col gap-3 py-2">
              <div className="grid max-w-xl grid-cols-3 gap-3">
                <Input
                  id={`ps-boxes-${item.pileId}`}
                  label="Boxes he can send"
                  type="number"
                  min={0}
                  value={canSendBoxes}
                  onChange={(e) => setCanSendBoxes(Number(e.target.value))}
                />
                <Input
                  id={`ps-expiry-${item.pileId}`}
                  label="Exact expiry (MM/YYYY)"
                  value={expiryExact}
                  onChange={(e) => setExpiryExact(e.target.value)}
                />
                <Input
                  id={`ps-batch-${item.pileId}`}
                  label="Batch (auth stock only)"
                  value={batch}
                  onChange={(e) => setBatch(e.target.value)}
                />
              </div>
              <Textarea
                id={`ps-note-${item.pileId}`}
                label="Call note"
                required
                value={callNote}
                onChange={(e) => setCallNote(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-danger-500">
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  loading={submitting}
                  disabled={!callNote}
                  icon={<FiCheck />}
                  onClick={() =>
                    void run(() =>
                      callApi((token) =>
                        proxyConfirmPile(token, item.pileId, {
                          sellerCounterpartyId: item.sellerCounterpartyId,
                          canSendBoxes,
                          expiryExact,
                          batch: batch || undefined,
                          callNote,
                        }),
                      ),
                    )
                  }
                >
                  Confirm
                </Button>
                <Button
                  variant="secondary"
                  loading={submitting}
                  disabled={!callNote}
                  onClick={() =>
                    void run(() =>
                      callApi((token) =>
                        proxyRequotePile(token, item.pileId, {
                          sellerCounterpartyId: item.sellerCounterpartyId,
                          callNote,
                        }),
                      ),
                    )
                  }
                >
                  Requote
                </Button>
                <Button
                  variant="secondary"
                  loading={submitting}
                  disabled={!callNote}
                  icon={<FiX />}
                  onClick={() =>
                    void run(() =>
                      callApi((token) =>
                        proxyDeclinePile(token, item.pileId, {
                          sellerCounterpartyId: item.sellerCounterpartyId,
                          callNote,
                        }),
                      ),
                    )
                  }
                >
                  Decline
                </Button>
              </div>
            </div>
          </Td>
        </tr>
      )}
    </>
  );
}
