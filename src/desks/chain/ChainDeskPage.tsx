import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { createPo, createSo, editPo, getChain, reduceSoQuantity } from '../../api/chain';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import type { ChainViewDto } from '../../api/dto';

const OVERRIDE_REASON_CODES = [
  'undercutting_local_trader',
  'near_expiry',
  'first_order_with_buyer',
  'freight_unusual',
  'matching_competitor_quote',
  'clearing_slow_stock',
];

/**
 * BR-031 — the six-stage chain strip is a required UI element on every SO,
 * PO and document screen; BR-037 — every document opens in full with its
 * event log. This one desk covers raising an SO (BR-048's staff price with
 * pre-fill and override), raising the PO against it (INV-01), editing a PO
 * (BR-036), the part-rejection quantity reduction (Q6), and the chain view.
 */
export function ChainDeskPage() {
  const [lastSoId, setLastSoId] = useState<string | null>(null);
  const [lastChainId, setLastChainId] = useState('');

  return (
    <main>
      <h1>Trade chain</h1>
      <CreateSoSection onCreated={(soId) => setLastSoId(soId)} />
      {lastSoId && <CreatePoSection soId={lastSoId} />}
      <EditPoSection />
      <ReduceSoQuantitySection />
      <ChainViewSection chainId={lastChainId} onChainIdChange={setLastChainId} />
    </main>
  );
}

function CreateSoSection({ onCreated }: { onCreated: (soId: string) => void }) {
  const { callApi } = useAuth();
  const [buyerId, setBuyerId] = useState('');
  const [sellerId, setSellerId] = useState('');
  const [skuId, setSkuId] = useState('');
  const [boxes, setBoxes] = useState(1);
  const [sellerNetRupees, setSellerNetRupees] = useState('');
  const [placeOfSupply, setPlaceOfSupply] = useState<'intra_state' | 'inter_state'>('intra_state');
  const [useOverride, setUseOverride] = useState(false);
  const [overrideRateRupees, setOverrideRateRupees] = useState('');
  const [overrideReasonCode, setOverrideReasonCode] = useState(OVERRIDE_REASON_CODES[0]);
  const [result, setResult] = useState<{ soId: string; soNo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await callApi((token) =>
        createSo(token, {
          buyerId,
          sellerId,
          skuId,
          boxes,
          sellerNetPaise: Math.round(Number(sellerNetRupees) * 100),
          placeOfSupply,
          ...(useOverride
            ? {
                overrideRatePaise: Math.round(Number(overrideRateRupees) * 100),
                overrideReasonCode,
              }
            : {}),
        }),
      );
      setResult(created);
      onCreated(created.soId);
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not raise the SO.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Raise a sales order</h2>
      <p className="note">
        The margin matrix pre-fills the buyer's rate from the seller's net (BR-048). Override it
        with a reason from the fixed dropdown when a desk decision calls for it.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="cs-buyer">Buyer ID</label>
        <input
          id="cs-buyer"
          value={buyerId}
          onChange={(e) => setBuyerId(e.target.value)}
          required
        />

        <label htmlFor="cs-seller">Seller ID</label>
        <input
          id="cs-seller"
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          required
        />

        <label htmlFor="cs-sku">SKU ID</label>
        <input id="cs-sku" value={skuId} onChange={(e) => setSkuId(e.target.value)} required />

        <label htmlFor="cs-boxes">Boxes (BR-051 — minimum one)</label>
        <input
          id="cs-boxes"
          type="number"
          min={1}
          value={boxes}
          onChange={(e) => setBoxes(Number(e.target.value))}
          required
        />

        <label htmlFor="cs-seller-net">Seller net rate, per base unit (₹)</label>
        <input
          id="cs-seller-net"
          type="number"
          step="0.01"
          min="0"
          value={sellerNetRupees}
          onChange={(e) => setSellerNetRupees(e.target.value)}
          required
        />

        <label htmlFor="cs-pos">Place of supply</label>
        <select
          id="cs-pos"
          value={placeOfSupply}
          onChange={(e) => setPlaceOfSupply(e.target.value as typeof placeOfSupply)}
        >
          <option value="intra_state">Intra-state (CGST + SGST)</option>
          <option value="inter_state">Inter-state (IGST)</option>
        </select>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
          />
          Override the pre-filled rate
        </label>
        {useOverride && (
          <>
            <label htmlFor="cs-override-rate">Override rate, per base unit (₹)</label>
            <input
              id="cs-override-rate"
              type="number"
              step="0.01"
              min="0"
              value={overrideRateRupees}
              onChange={(e) => setOverrideRateRupees(e.target.value)}
              required={useOverride}
            />
            <label htmlFor="cs-override-reason">Override reason</label>
            <select
              id="cs-override-reason"
              value={overrideReasonCode}
              onChange={(e) => setOverrideReasonCode(e.target.value)}
            >
              {OVERRIDE_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {code.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </>
        )}

        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {result && (
          <p className="note">
            Raised <strong>{result.soNo}</strong>.
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Raising…' : 'Raise SO'}
        </button>
      </form>
    </section>
  );
}

function CreatePoSection({ soId }: { soId: string }) {
  const { callApi } = useAuth();
  const [result, setResult] = useState<{ poId: string; poNo: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      setResult(await callApi((token) => createPo(token, soId)));
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not raise the PO — is the SO paid in full? (INV-01)',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Raise the PO for {soId}</h2>
      <p className="note">
        409 unless posted receipts have reached the SO total (INV-01) — there is no partial PO on
        partial payment.
      </p>
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="note">
          Raised <strong>{result.poNo}</strong>.
        </p>
      )}
      <button type="button" onClick={() => void handleCreate()} disabled={submitting}>
        {submitting ? 'Raising…' : 'Raise PO'}
      </button>
    </section>
  );
}

function EditPoSection() {
  const { callApi } = useAuth();
  const [poId, setPoId] = useState('');
  const [field, setField] = useState<'rate' | 'qty'>('rate');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setDone(false);
    setSubmitting(true);
    try {
      const toValue = field === 'rate' ? Math.round(Number(to) * 100) : Number(to);
      await callApi((token) => editPo(token, poId, { field, to: toValue, reason }));
      setDone(true);
      setReason('');
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not edit the PO.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Edit a PO</h2>
      <p className="note">
        BR-036 — only rate or quantity are ever editable, every edit carries a reason, and never
        after billing.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="ep-po">PO ID</label>
        <input id="ep-po" value={poId} onChange={(e) => setPoId(e.target.value)} required />

        <label htmlFor="ep-field">Field</label>
        <select
          id="ep-field"
          value={field}
          onChange={(e) => setField(e.target.value as typeof field)}
        >
          <option value="rate">Rate (₹ per base unit)</option>
          <option value="qty">Quantity (boxes)</option>
        </select>

        <label htmlFor="ep-to">New value</label>
        <input
          id="ep-to"
          type="number"
          step={field === 'rate' ? '0.01' : '1'}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />

        <label htmlFor="ep-reason">Reason</label>
        <textarea
          id="ep-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {done && <p className="note">Edit recorded.</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save edit'}
        </button>
      </form>
    </section>
  );
}

function ReduceSoQuantitySection() {
  const { callApi } = useAuth();
  const [soId, setSoId] = useState('');
  const [newBoxes, setNewBoxes] = useState(0);
  const [reason, setReason] = useState('');
  const [inspectionId, setInspectionId] = useState('');
  const [result, setResult] = useState<{ refundId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) => reduceSoQuantity(token, soId, { newBoxes, reason, inspectionId })),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not reduce the SO quantity.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>Part rejection — reduce SO quantity</h2>
      <p className="note">
        Q6 — reduces the SO to the accepted quantity from the inspection, raises the refund for the
        difference, and cannot run once a Marg bill exists for this SO.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="rq-so">SO ID</label>
        <input id="rq-so" value={soId} onChange={(e) => setSoId(e.target.value)} required />

        <label htmlFor="rq-inspection">Inspection ID</label>
        <input
          id="rq-inspection"
          value={inspectionId}
          onChange={(e) => setInspectionId(e.target.value)}
          required
        />

        <label htmlFor="rq-boxes">Accepted boxes</label>
        <input
          id="rq-boxes"
          type="number"
          min={0}
          value={newBoxes}
          onChange={(e) => setNewBoxes(Number(e.target.value))}
          required
        />

        <label htmlFor="rq-reason">Reason</label>
        <textarea
          id="rq-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {result && (
          <p className="note">
            SO reduced. Refund <strong>{result.refundId}</strong> raised.
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reduce quantity'}
        </button>
      </form>
    </section>
  );
}

function ChainViewSection({
  chainId,
  onChainIdChange,
}: {
  chainId: string;
  onChainIdChange: (value: string) => void;
}) {
  const { callApi } = useAuth();
  const [lookupId, setLookupId] = useState(chainId);

  const loader = useCallback(
    () => callApi((token) => getChain(token, lookupId)),
    [callApi, lookupId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <section>
      <h2>Chain view</h2>
      <p className="note">
        BR-031 — the six-stage strip; BR-037 — every document opens in full with its complete event
        log.
      </p>
      <label htmlFor="cv-chain">Chain ID</label>
      <input
        id="cv-chain"
        value={lookupId}
        onChange={(e) => {
          setLookupId(e.target.value);
          onChainIdChange(e.target.value);
        }}
      />
      <button type="button" onClick={retry} disabled={!lookupId}>
        Open
      </button>

      {lookupId && (
        <AsyncBoundary state={state} onRetry={retry}>
          {(chain: ChainViewDto) => (
            <div className="chain-strip">
              <p>
                <strong>{chain.chainNo}</strong> — stage: <code>{chain.stage}</code>
              </p>
              <ol className="stage-strip">
                {['so', 'payment', 'po', 'leg1', 'marg', 'dispatch', 'done'].map((stage) => (
                  <li key={stage} className={stage === chain.stage ? 'stage-current' : ''}>
                    {stage}
                  </li>
                ))}
              </ol>

              {chain.so && (
                <div>
                  <h3>SO {chain.so.soNo}</h3>
                  <p>
                    State: {chain.so.state} · Total: ₹{(chain.so.totalPaise / 100).toFixed(2)} · Pay
                    deadline: {new Date(chain.so.payDeadline).toLocaleString()}
                  </p>
                </div>
              )}
              {chain.po && (
                <div>
                  <h3>PO {chain.po.poNo}</h3>
                  <p>
                    State: {chain.po.state} · Dispatch due:{' '}
                    {new Date(chain.po.dispatchDueDate).toLocaleString()}
                  </p>
                </div>
              )}

              <h3>Event log</h3>
              <table>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {chain.events.map((event, index) => (
                    <tr key={index}>
                      <td>{new Date(event.at).toLocaleString()}</td>
                      <td>{event.type}</td>
                      <td>{event.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      )}
    </section>
  );
}
