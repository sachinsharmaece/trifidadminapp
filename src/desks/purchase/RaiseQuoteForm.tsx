import { useEffect, useState } from 'react';
import { proxyPostQuote } from '../../api/proxy';
import { getSkusForProduct } from '../../api/catalog';
import type { SkuDto } from '../../api/dto';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * A quote raised on a seller's behalf, on a call — the same `postQuote` his own screen uses, so
 * the batch rule, the buyer's 24-hour hold and the gap checks all apply. Shared by the Demand
 * screen (per ask, per seller) and the seller file's "Open demand he could serve".
 */
export function RaiseQuoteForm({
  askId,
  skuId,
  productId,
  sellerId,
  sellerCounterpartyId,
  sellerFirm,
  onDone,
}: {
  askId: string;
  /** The pack the ask names, or `null` for a product-level ask (the pack is then picked here). */
  skuId: string | null;
  productId: string | null;
  sellerId: string;
  sellerCounterpartyId: string;
  sellerFirm: string;
  onDone: () => void;
}) {
  const { callApi } = useAuth();
  const needsPack = skuId === null;
  const [packs, setPacks] = useState<SkuDto[]>([]);
  const [packId, setPackId] = useState('');
  useEffect(() => {
    if (!needsPack || !productId) return;
    callApi((token) => getSkusForProduct(token, productId))
      .then((skus) => setPacks(skus.filter((s) => s.state !== 'draft')))
      .catch(() => setPacks([]));
  }, [needsPack, productId, callApi]);
  const [rupees, setRupees] = useState('');
  const [qty, setQty] = useState('');
  const [expiryBand, setExpiryBand] = useState<'over12' | 'under12'>('over12');
  const [expiryExact, setExpiryExact] = useState('');
  const [deliveryBand, setDeliveryBand] = useState<'48h' | '2-5d'>('48h');
  const [provenance, setProvenance] = useState<'company' | 'auth'>('company');
  const [batch, setBatch] = useState('');
  const [days, setDays] = useState('');
  const [callNote, setCallNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const ready =
    (!needsPack || packId !== '') &&
    Number(rupees) > 0 &&
    Number(qty) >= 1 &&
    /^(0[1-9]|1[0-2])\/\d{4}$/.test(expiryExact) &&
    days !== '' &&
    callNote.trim() !== '' &&
    (provenance !== 'auth' || batch.trim() !== '');

  async function submit() {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        proxyPostQuote(token, askId, {
          sellerCounterpartyId,
          ...(needsPack ? { skuId: packId } : {}),
          ratePaiseForIndore: Math.round(Number(rupees) * 100),
          qtyAvailable: Number(qty),
          expiryBand,
          expiryExact,
          deliveryBand,
          provenance,
          batch: provenance === 'auth' ? batch.trim() : undefined,
          daysToIndore: Number(days),
          callNote: callNote.trim(),
        }),
      );
      onDone();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not raise this quote.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  const id = (name: string) => `rq-${askId}-${sellerId}-${name}`;
  return (
    <div className="mt-2 flex w-full flex-col gap-3 rounded border border-slate-200 p-3">
      <p className="text-slate-500">
        Raised on {sellerFirm}&apos;s behalf, on a call. Same checks as his own quote. It goes on
        every buyer&apos;s board now; Sales gives it to the buyer who asked.
      </p>
      <div className="grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
        {needsPack && (
          <Select
            id={id('pack')}
            label="Pack quoted"
            value={packId}
            onChange={(e) => setPackId(e.target.value)}
          >
            <option value="" disabled>
              Pick the pack…
            </option>
            {packs.map((p) => (
              <option key={p.skuId} value={p.skuId}>
                {p.packLabel}
              </option>
            ))}
          </Select>
        )}
        <Input
          id={id('rate')}
          label="Rate for Indore (₹)"
          type="number"
          min={0}
          step="0.01"
          value={rupees}
          onChange={(e) => setRupees(e.target.value)}
        />
        <Input
          id={id('qty')}
          label="Boxes available"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <Input
          id={id('days')}
          label="Days to Indore"
          type="number"
          min={0}
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <Input
          id={id('expiry')}
          label="Exact expiry (MM/YYYY)"
          value={expiryExact}
          onChange={(e) => setExpiryExact(e.target.value)}
        />
        <Select
          id={id('band')}
          label="Expiry band"
          value={expiryBand}
          onChange={(e) => setExpiryBand(e.target.value as 'over12' | 'under12')}
        >
          <option value="over12">Over 12 months</option>
          <option value="under12">Under 12 months</option>
        </Select>
        <Select
          id={id('delivery')}
          label="Delivery"
          value={deliveryBand}
          onChange={(e) => setDeliveryBand(e.target.value as '48h' | '2-5d')}
        >
          <option value="48h">48 hours</option>
          <option value="2-5d">2–5 days</option>
        </Select>
        <Select
          id={id('prov')}
          label="Stock"
          value={provenance}
          onChange={(e) => setProvenance(e.target.value as 'company' | 'auth')}
        >
          <option value="company">Company stock</option>
          <option value="auth">His own (authorised) stock</option>
        </Select>
        {provenance === 'auth' && (
          <Input
            id={id('batch')}
            label="Batch"
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
          />
        )}
      </div>
      <Textarea
        id={id('note')}
        label="Call note"
        required
        value={callNote}
        onChange={(e) => setCallNote(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-danger-500">
          {error}
        </p>
      )}
      <div>
        <Button loading={submitting} disabled={!ready} onClick={() => void submit()}>
          Raise quote
        </Button>
      </div>
    </div>
  );
}
