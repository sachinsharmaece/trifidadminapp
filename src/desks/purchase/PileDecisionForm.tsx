import { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { proxyConfirmPile, proxyDeclinePile, proxyRequotePile } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { EXPIRY_EXACT } from './listingExpiry';

/**
 * Answering a pile on the seller's behalf, on a call: confirm, requote or decline. These are the
 * seller's own `confirmPile` / `requotePile` / `declinePile`, so the gate is his too — but only
 * what the listing has not already given: the expiry (a year at least; the month is optional) when
 * the line was listed without one, and the batch only where the stock is his own (BR-102, BR-105).
 * The boxes he can send start at what he listed, capped by what the buyers asked. Shared by the
 * Confirmations tab and the seller file.
 */
export function PileDecisionForm({
  pileId,
  sellerCounterpartyId,
  boxes,
  lineQty,
  listedExpiry,
  provenance,
  onDecided,
}: {
  pileId: string;
  sellerCounterpartyId: string;
  /** Boxes buyers have piled. */
  boxes: number;
  /** Boxes he listed on the line. */
  lineQty: number;
  /** The expiry he listed it with, if any. */
  listedExpiry: string | null;
  provenance: 'company' | 'auth';
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [canSendBoxes, setCanSendBoxes] = useState(lineQty > 0 ? Math.min(boxes, lineQty) : boxes);
  const [expiryExact, setExpiryExact] = useState(listedExpiry ?? '');
  const [batch, setBatch] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const expiry = expiryExact.trim();
  const expiryBad = expiry !== '' && !EXPIRY_EXACT.test(expiry);
  // Typed or listed, the year is the least; with neither there is nothing to confirm on.
  const expiryMissing = expiry === '' && !listedExpiry;
  const needsBatch = provenance === 'auth';
  const canConfirm =
    callNote.trim() !== '' && !expiryBad && !expiryMissing && (!needsBatch || batch.trim() !== '');

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
      <div
        className={`grid max-w-xl grid-cols-1 gap-3 ${needsBatch ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        <Input
          id={`ps-boxes-${pileId}`}
          label="Boxes he can send"
          type="number"
          min={0}
          value={canSendBoxes}
          onChange={(e) => setCanSendBoxes(Number(e.target.value))}
          hint={`He listed ${lineQty}; buyers asked for ${boxes}.`}
        />
        <Input
          id={`ps-expiry-${pileId}`}
          label="Expiry — year, or MM/YYYY"
          required={!listedExpiry}
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
          error={
            expiryBad
              ? 'Give the expiry as a year (2028) or a month and year (03/2028).'
              : undefined
          }
          hint={
            listedExpiry
              ? 'From his listing — change it only if it differs.'
              : 'Not on his listing: the year at least, e.g. 2028 or 03/2028.'
          }
        />
        {needsBatch && (
          <Input
            id={`ps-batch-${pileId}`}
            label="Batch (My stock)"
            required
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
        )}
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
          disabled={!canConfirm}
          icon={<FiCheck />}
          onClick={() =>
            void run(() =>
              callApi((token) =>
                proxyConfirmPile(token, pileId, {
                  sellerCounterpartyId,
                  canSendBoxes,
                  // Cleared, the listing's own stands (the server falls back to it).
                  expiryExact: expiry || undefined,
                  batch: needsBatch ? batch.trim() : undefined,
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
