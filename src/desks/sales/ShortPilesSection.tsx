import { useCallback, useMemo, useState } from 'react';
import { getShortPiles, resolveShortPile, type ShortPile } from '../../api/sales';
import { errorText } from '../../components/ActionModal';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Input';
import { Table, Td, Th } from '../../components/ui/Table';
import { useOptionalToast } from '../../components/ui/Toast';

/**
 * 2 Nov — BR-134. A seller confirmed fewer boxes than the buyers on his pile asked for, so no order
 * was made. Sales divides what he can send between them — no automatic rule; the buyers are listed
 * in the order they asked, and that is only where the boxes start. What a buyer asked for and does
 * not get goes back to him as an open ask, so Purchase finds another seller for it.
 */
export function ShortPilesSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getShortPiles(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  // Quiet unless there is something to divide.
  if (state.status !== 'success') return null;

  return (
    <Card title="Short piles — who gets the boxes">
      <p className="mb-4 text-sm text-slate-500">
        The seller can send fewer boxes than were asked for, so nothing is ordered yet. Divide what
        he can send between the buyers. What a buyer does not get stays open as his ask, and
        Purchase finds another seller for it.
      </p>
      <div className="flex flex-col gap-6">
        {state.data.map((pile) => (
          <ShortPileForm key={pile.pileId} pile={pile} onDone={retry} />
        ))}
      </div>
    </Card>
  );
}

/** First come, first served: a starting point the desk changes, never applied by itself. */
function firstComeFirstServed(pile: ShortPile): number[] {
  let left = pile.canSend;
  return pile.requests.map((r) => {
    const got = Math.min(r.boxes, left);
    left -= got;
    return got;
  });
}

const BOX_INPUT =
  'w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30';

function ShortPileForm({ pile, onDone }: { pile: ShortPile; onDone: () => void }) {
  const { callApi } = useAuth();
  const toast = useOptionalToast();
  const [gets, setGets] = useState<number[]>(() => firstComeFirstServed(pile));
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = useMemo(() => gets.reduce((sum, n) => sum + n, 0), [gets]);
  const wholeBoxes = gets.every(
    (n, i) => Number.isInteger(n) && n >= 0 && n <= pile.requests[i]!.boxes,
  );
  const over = total > pile.canSend;
  const valid = wholeBoxes && !over && reason.trim().length > 0;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result = await callApi((token) =>
        resolveShortPile(token, pile.pileId, {
          allocations: pile.requests.map((r, i) => ({
            pileRequestId: r.pileRequestId,
            boxes: gets[i]!,
          })),
          reason: reason.trim(),
        }),
      );
      toast?.show(
        result.backOnAskBoxes > 0
          ? `${result.orderedBoxes} boxes ordered; ${result.backOnAskBoxes} are open as asks.`
          : `${result.orderedBoxes} boxes ordered.`,
      );
      onDone();
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  }

  return (
    <section aria-label={`${pile.brand} ${pile.packLabel} short pile`}>
      <h3 className="mb-1 text-sm font-semibold text-slate-900">
        {pile.brand} <span className="font-normal text-slate-500">{pile.packLabel}</span>
      </h3>
      <p className="mb-3 text-sm text-slate-600">
        He can send <strong>{pile.canSend}</strong> of the <strong>{pile.asked}</strong> boxes asked
        for.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Buyer</Th>
            <Th numeric>Asked</Th>
            <Th numeric>Gets</Th>
            <Th>Rest</Th>
          </tr>
        </thead>
        <tbody>
          {pile.requests.map((r, i) => (
            <tr key={r.pileRequestId}>
              <Td>{r.firm}</Td>
              <Td numeric>{r.boxes}</Td>
              <Td numeric>
                <input
                  type="number"
                  min={0}
                  max={r.boxes}
                  step={1}
                  aria-label={`Boxes for ${r.firm}`}
                  className={BOX_INPUT}
                  value={Number.isNaN(gets[i]) ? '' : gets[i]}
                  onChange={(e) =>
                    setGets((prev) => prev.map((n, j) => (j === i ? e.target.valueAsNumber : n)))
                  }
                />
              </Td>
              <Td className="text-slate-500">
                {gets[i]! < r.boxes ? `${r.boxes - (gets[i] || 0)} back on his ask` : '—'}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className={`mt-2 text-sm ${over ? 'text-danger-500 font-medium' : 'text-slate-600'}`}>
        Giving {total} of the {pile.canSend} he can send
        {!over && total < pile.canSend ? ` — ${pile.canSend - total} stay on his listing` : ''}
        {over ? ' — that is more than he can send' : ''}.
      </p>
      <div className="mt-3 max-w-xl">
        <Textarea
          label="Why this split"
          required
          hint="Kept on record. There is no automatic rule yet; the one you actually use is what gets automated."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {error}
        </p>
      )}
      <div className="mt-3">
        <Button onClick={() => void submit()} disabled={!valid || busy}>
          {busy ? 'Dividing…' : 'Divide the boxes'}
        </Button>
      </div>
    </section>
  );
}
