import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheckCircle, FiSend, FiEdit2, FiMinusCircle, FiSearch } from 'react-icons/fi';
import { createPo, createSo, editPo, getChain, reduceSoQuantity } from '../../api/chain';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { ChainViewDto } from '../../api/dto';

const OVERRIDE_REASON_CODES = [
  'undercutting_local_trader',
  'near_expiry',
  'first_order_with_buyer',
  'freight_unusual',
  'matching_competitor_quote',
  'clearing_slow_stock',
];

const CHAIN_STAGES = ['so', 'payment', 'po', 'leg1', 'marg', 'dispatch', 'done'];

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
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Trade chain</h1>
      <DevNote screen="admin_chain" />
      <CreateSoSection onCreated={(soId) => setLastSoId(soId)} />
      {lastSoId && <CreatePoSection soId={lastSoId} />}
      <EditPoSection />
      <ReduceSoQuantitySection />
      <ChainViewSection chainId={lastChainId} onChainIdChange={setLastChainId} />
    </div>
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
    <Card title="Raise a sales order">
      <p className="mb-4 text-sm text-slate-500">
        The margin matrix pre-fills the buyer&apos;s rate from the seller&apos;s net (BR-048).
        Override it with a reason from the fixed dropdown when a desk decision calls for it.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="cs-buyer"
          label="Buyer ID"
          value={buyerId}
          onChange={(e) => setBuyerId(e.target.value)}
          required
        />
        <Input
          id="cs-seller"
          label="Seller ID"
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          required
        />
        <Input
          id="cs-sku"
          label="SKU ID"
          value={skuId}
          onChange={(e) => setSkuId(e.target.value)}
          required
        />
        <Input
          id="cs-boxes"
          label="Boxes"
          hint="BR-051 — minimum one"
          type="number"
          min={1}
          value={boxes}
          onChange={(e) => setBoxes(Number(e.target.value))}
          required
        />
        <Input
          id="cs-seller-net"
          label="Seller net rate, per base unit (₹)"
          type="number"
          step="0.01"
          min="0"
          value={sellerNetRupees}
          onChange={(e) => setSellerNetRupees(e.target.value)}
          required
        />
        <Select
          id="cs-pos"
          label="Place of supply"
          value={placeOfSupply}
          onChange={(e) => setPlaceOfSupply(e.target.value as typeof placeOfSupply)}
        >
          <option value="intra_state">Intra-state (CGST + SGST)</option>
          <option value="inter_state">Inter-state (IGST)</option>
        </Select>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={useOverride}
            onChange={(e) => setUseOverride(e.target.checked)}
          />
          Override the pre-filled rate
        </label>
        {useOverride && (
          <>
            <Input
              id="cs-override-rate"
              label="Override rate, per base unit (₹)"
              type="number"
              step="0.01"
              min="0"
              value={overrideRateRupees}
              onChange={(e) => setOverrideRateRupees(e.target.value)}
              required={useOverride}
            />
            <Select
              id="cs-override-reason"
              label="Override reason"
              value={overrideReasonCode}
              onChange={(e) => setOverrideReasonCode(e.target.value)}
            >
              {OVERRIDE_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {code.replaceAll('_', ' ')}
                </option>
              ))}
            </Select>
          </>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-success-600">
            Raised <strong>{result.soNo}</strong>.
          </p>
        )}
        <Button type="submit" loading={submitting} icon={<FiSend />}>
          Raise SO
        </Button>
      </form>
    </Card>
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
    <Card title={`Raise the PO for ${soId}`}>
      <p className="mb-4 text-sm text-slate-500">
        409 unless posted receipts have reached the SO total (INV-01) — there is no partial PO on
        partial payment.
      </p>
      {error && (
        <p role="alert" className="mb-2 text-sm text-danger-500">
          {error}
        </p>
      )}
      {result && (
        <p className="mb-2 text-sm text-success-600">
          Raised <strong>{result.poNo}</strong>.
        </p>
      )}
      <Button onClick={() => void handleCreate()} loading={submitting} icon={<FiCheckCircle />}>
        Raise PO
      </Button>
    </Card>
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
    <Card title="Edit a PO">
      <p className="mb-4 text-sm text-slate-500">
        BR-036 — only rate or quantity are ever editable, every edit carries a reason, and never
        after billing.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="ep-po"
          label="PO ID"
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          required
        />
        <Select
          id="ep-field"
          label="Field"
          value={field}
          onChange={(e) => setField(e.target.value as typeof field)}
        >
          <option value="rate">Rate (₹ per base unit)</option>
          <option value="qty">Quantity (boxes)</option>
        </Select>
        <Input
          id="ep-to"
          label="New value"
          type="number"
          step={field === 'rate' ? '0.01' : '1'}
          value={to}
          onChange={(e) => setTo(e.target.value)}
          required
        />
        <Textarea
          id="ep-reason"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {done && <p className="text-sm text-success-600">Edit recorded.</p>}
        <Button type="submit" loading={submitting} icon={<FiEdit2 />}>
          Save edit
        </Button>
      </form>
    </Card>
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
    <Card title="Part rejection — reduce SO quantity">
      <p className="mb-4 text-sm text-slate-500">
        Q6 — reduces the SO to the accepted quantity from the inspection, raises the refund for the
        difference, and cannot run once a Marg bill exists for this SO.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="rq-so"
          label="SO ID"
          value={soId}
          onChange={(e) => setSoId(e.target.value)}
          required
        />
        <Input
          id="rq-inspection"
          label="Inspection ID"
          value={inspectionId}
          onChange={(e) => setInspectionId(e.target.value)}
          required
        />
        <Input
          id="rq-boxes"
          label="Accepted boxes"
          type="number"
          min={0}
          value={newBoxes}
          onChange={(e) => setNewBoxes(Number(e.target.value))}
          required
        />
        <Textarea
          id="rq-reason"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-success-600">
            SO reduced. Refund <strong>{result.refundId}</strong> raised.
          </p>
        )}
        <Button type="submit" loading={submitting} icon={<FiMinusCircle />}>
          Reduce quantity
        </Button>
      </form>
    </Card>
  );
}

function ChainStrip({ currentStage }: { currentStage: string }) {
  const currentIndex = CHAIN_STAGES.indexOf(currentStage);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {CHAIN_STAGES.map((stage, index) => (
        <li key={stage} className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              index < currentIndex
                ? 'bg-success-50 text-success-600'
                : index === currentIndex
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {stage}
          </span>
          {index < CHAIN_STAGES.length - 1 && <span className="text-slate-300">→</span>}
        </li>
      ))}
    </ol>
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
    <Card title="Chain view">
      <p className="mb-4 text-sm text-slate-500">
        BR-031 — the six-stage strip; BR-037 — every document opens in full with its complete event
        log.
      </p>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          id="cv-chain"
          label="Chain ID"
          value={lookupId}
          onChange={(e) => {
            setLookupId(e.target.value);
            onChainIdChange(e.target.value);
          }}
        />
        <Button variant="secondary" onClick={retry} disabled={!lookupId} icon={<FiSearch />}>
          Open
        </Button>
      </div>

      {lookupId && (
        <AsyncBoundary state={state} onRetry={retry}>
          {(chain: ChainViewDto) => (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-slate-700">
                <strong>{chain.chainNo}</strong> — stage: <code>{chain.stage}</code>
              </p>
              <ChainStrip currentStage={chain.stage} />

              {chain.so && (
                <div className="text-sm text-slate-700">
                  <h3 className="font-semibold text-slate-900">SO {chain.so.soNo}</h3>
                  <p>
                    State: {chain.so.state} · Total: ₹{(chain.so.totalPaise / 100).toFixed(2)} · Pay
                    deadline: {new Date(chain.so.payDeadline).toLocaleString()}
                  </p>
                </div>
              )}
              {chain.po && (
                <div className="text-sm text-slate-700">
                  <h3 className="font-semibold text-slate-900">PO {chain.po.poNo}</h3>
                  <p>
                    State: {chain.po.state} · Dispatch due:{' '}
                    {new Date(chain.po.dispatchDueDate).toLocaleString()}
                  </p>
                </div>
              )}

              <h3 className="text-sm font-semibold text-slate-900">Event log</h3>
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Type</Th>
                    <Th>Summary</Th>
                  </tr>
                </thead>
                <tbody>
                  {chain.events.map((event, index) => (
                    <tr key={index}>
                      <Td>{new Date(event.at).toLocaleString()}</Td>
                      <Td>{event.type}</Td>
                      <Td>{event.summary}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </AsyncBoundary>
      )}
    </Card>
  );
}
