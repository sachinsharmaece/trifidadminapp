import { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { proxyConfirmPile, proxyDeclinePile, proxyRequotePile } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * Answering a pile on the seller's behalf, on a call: confirm, requote or decline. These are the
 * seller's own `confirmPile` / `requotePile` / `declinePile`, so the gate is his too — the exact
 * expiry month always, and the batch where the stock is his own. Shared by the Confirmations tab
 * and the seller file.
 */
export function PileDecisionForm({
  pileId,
  sellerCounterpartyId,
  boxes,
  onDecided,
}: {
  pileId: string;
  sellerCounterpartyId: string;
  /** Boxes buyers have piled — what he can send starts here. */
  boxes: number;
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [canSendBoxes, setCanSendBoxes] = useState(boxes);
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
    <div className="flex flex-col gap-3 py-2">
      <div className="grid max-w-xl grid-cols-3 gap-3">
        <Input
          id={`ps-boxes-${pileId}`}
          label="Boxes he can send"
          type="number"
          min={0}
          value={canSendBoxes}
          onChange={(e) => setCanSendBoxes(Number(e.target.value))}
        />
        <Input
          id={`ps-expiry-${pileId}`}
          label="Exact expiry (MM/YYYY)"
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
        />
        <Input
          id={`ps-batch-${pileId}`}
          label="Batch (auth stock only)"
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
        />
      </div>
      <Textarea
        id={`ps-note-${pileId}`}
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
                proxyConfirmPile(token, pileId, {
                  sellerCounterpartyId,
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
                proxyRequotePile(token, pileId, { sellerCounterpartyId, callNote }),
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
                proxyDeclinePile(token, pileId, { sellerCounterpartyId, callNote }),
              ),
            )
          }
        >
          Decline
        </Button>
      </div>
    </div>
  );
}
