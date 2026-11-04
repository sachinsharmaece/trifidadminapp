import { useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { proxyConfirmPile, proxyDeclinePile, proxyRequotePile } from '../../api/proxy';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MONTHS } from './listingExpiry';

/**
 * Answering a pile on the seller's behalf, on a call: confirm, requote or decline. These are the
 * seller's own `confirmPile` / `requotePile` / `declinePile`.
 *
 * 3 Nov (My view sheet) — this overrides BR-102/BR-105 on the staff path: the expiry (a month
 * and/or year) and the call note are optional, and there is no batch field at all, "My stock"
 * included. When an expiry is given it is sent as before (a year, or MM/YYYY) and the server still
 * checks its format; when it is left blank the listing's own expiry stands. The boxes he can send
 * start at what he listed, capped by what the buyers asked. Shared by the Confirmations tab and
 * the seller file.
 */

const YEARS_AHEAD = 6;
const LISTED_EXPIRY = /^(?:(0[1-9]|1[0-2])\/)?(\d{4})$/;

/** The listing's expiry ("2028" or "03/2028") split into the two dropdowns' values. */
function splitExpiry(expiry: string | null): { month: string; year: string } {
  const match = expiry ? LISTED_EXPIRY.exec(expiry) : null;
  return { month: match?.[1] ?? '', year: match?.[2] ?? '' };
}

/** This year to six years on, plus the listed year when it falls outside that range. */
function yearOptions(listedYear: string): string[] {
  const thisYear = new Date().getFullYear();
  const years = new Set<number>();
  for (let y = thisYear; y <= thisYear + YEARS_AHEAD; y += 1) years.add(y);
  if (listedYear) years.add(Number(listedYear));
  return [...years].sort((a, b) => a - b).map(String);
}

export function PileDecisionForm({
  pileId,
  sellerCounterpartyId,
  boxes,
  lineQty,
  listedExpiry,
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
  /** Kept on the row for callers; the form no longer asks for a batch. */
  provenance?: 'company' | 'auth';
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const listed = splitExpiry(listedExpiry);
  const [canSendBoxes, setCanSendBoxes] = useState(lineQty > 0 ? Math.min(boxes, lineQty) : boxes);
  const [expiryMonth, setExpiryMonth] = useState(listed.month);
  const [expiryYear, setExpiryYear] = useState(listed.year);
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // A month on its own is not an expiry: the year is the least that counts.
  const monthWithoutYear = expiryMonth !== '' && expiryYear === '';
  const expiryExact = expiryYear ? (expiryMonth ? `${expiryMonth}/${expiryYear}` : expiryYear) : '';
  const canConfirm = !monthWithoutYear;
  const note = callNote.trim();

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
      <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          id={`ps-boxes-${pileId}`}
          label="Boxes he can send"
          type="number"
          min={0}
          value={canSendBoxes}
          onChange={(e) => setCanSendBoxes(Number(e.target.value))}
          hint={`He listed ${lineQty}; buyers asked for ${boxes}.`}
        />
        <Select
          id={`ps-expiry-month-${pileId}`}
          label="Expiry month (optional)"
          value={expiryMonth}
          onChange={(e) => setExpiryMonth(e.target.value)}
          error={monthWithoutYear ? 'Pick the year as well, or clear the month.' : undefined}
        >
          <option value="" />
          {MONTHS.map((name, i) => {
            const value = String(i + 1).padStart(2, '0');
            return (
              <option key={value} value={value}>
                {name}
              </option>
            );
          })}
        </Select>
        <Select
          id={`ps-expiry-year-${pileId}`}
          label="Expiry year (optional)"
          value={expiryYear}
          onChange={(e) => setExpiryYear(e.target.value)}
          hint={
            listedExpiry
              ? 'From his listing — change it only if it differs.'
              : 'Leave blank if he cannot say yet.'
          }
        >
          <option value="" />
          {yearOptions(listed.year).map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </Select>
      </div>
      <Textarea
        id={`ps-note-${pileId}`}
        label="Call note (optional)"
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
                  // Blank, the listing's own stands (the server falls back to it).
                  expiryExact: expiryExact || undefined,
                  callNote: note,
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
          onClick={() =>
            void run(() =>
              callApi((token) =>
                proxyRequotePile(token, pileId, { sellerCounterpartyId, callNote: note }),
              ),
            )
          }
        >
          Requote
        </Button>
        <Button
          variant="secondary"
          loading={submitting}
          icon={<FiX />}
          onClick={() =>
            void run(() =>
              callApi((token) =>
                proxyDeclinePile(token, pileId, { sellerCounterpartyId, callNote: note }),
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
