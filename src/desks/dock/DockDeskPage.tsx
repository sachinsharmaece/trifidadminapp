import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiClipboard, FiCheckCircle, FiTruck } from 'react-icons/fi';
import { applyInspection, recordInspection } from '../../api/dock';
import { recordMovement } from '../../api/movement';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const REASON_CODES = [
  'case_count_short',
  'visible_external_damage',
  'leakage',
  'batch_mismatch',
  'expiry_mismatch',
];

/**
 * Minimal Logistics capture — enough for BR-030 stages 4 and 6 to complete
 * (Q9a/Q9b). BR-190 — the dock records, Purchase applies: recording an
 * inspection and applying its consequence are two separate actions here,
 * on purpose, matching who is actually allowed to do each one server-side.
 */
export function DockDeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dock &amp; movements</h1>
      <InspectionSection />
      <ApplyInspectionSection />
      <MovementSection />
    </div>
  );
}

function InspectionSection() {
  const { callApi } = useAuth();
  const [poId, setPoId] = useState('');
  const [casesAccepted, setCasesAccepted] = useState(0);
  const [casesRejected, setCasesRejected] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [photoRef, setPhotoRef] = useState('');
  const [result, setResult] = useState<{ inspectionId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleReason(code: string): void {
    setReasons((current) =>
      current.includes(code) ? current.filter((r) => r !== code) : [...current, code],
    );
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          recordInspection(token, poId, {
            casesAccepted,
            casesRejected,
            reasons,
            photoRefs: photoRef ? [photoRef] : [],
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not record this inspection.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Record an inspection">
      <p className="mb-4 text-sm text-slate-500">
        BR-182 — outer box only: case count, visible damage, leakage, batch and expiry against the
        PO. BR-184 — immutable once submitted; the dock head signs by submitting this.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="in-po"
          label="PO ID"
          value={poId}
          onChange={(e) => setPoId(e.target.value)}
          required
        />
        <Input
          id="in-accepted"
          label="Cases accepted"
          type="number"
          min={0}
          value={casesAccepted}
          onChange={(e) => setCasesAccepted(Number(e.target.value))}
          required
        />
        <Input
          id="in-rejected"
          label="Cases rejected"
          type="number"
          min={0}
          value={casesRejected}
          onChange={(e) => setCasesRejected(Number(e.target.value))}
          required
        />

        <fieldset className="rounded-md border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Rejection reasons (fixed codes)
          </legend>
          <div className="flex flex-col gap-2">
            {REASON_CODES.map((code) => (
              <label key={code} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={reasons.includes(code)}
                  onChange={() => toggleReason(code)}
                />
                {code.replaceAll('_', ' ')}
              </label>
            ))}
          </div>
        </fieldset>

        <Input
          id="in-photo"
          label="Photo reference"
          value={photoRef}
          onChange={(e) => setPhotoRef(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Recorded as {result.inspectionId}.</p>}
        <Button type="submit" loading={submitting} icon={<FiClipboard />}>
          Submit inspection
        </Button>
      </form>
    </Card>
  );
}

function ApplyInspectionSection() {
  const { callApi } = useAuth();
  const [poId, setPoId] = useState('');
  const [result, setResult] = useState<{
    soState: string;
    sellerBillId?: string;
    debitNoteId?: string;
    refundId?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApply(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      setResult(await callApi((token) => applyInspection(token, poId)));
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not apply this inspection.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Apply the inspection (Purchase)">
      <p className="mb-4 text-sm text-slate-500">
        BR-190 — the dock records; Purchase converts the finding into a payment consequence: a
        seller bill on the accepted quantity (Q5a), a debit note for any rejected value (Q5b), or,
        on a whole-lot rejection, a supply failure with a full refund (BR-186).
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input id="ap-po" label="PO ID" value={poId} onChange={(e) => setPoId(e.target.value)} />
        <Button
          onClick={() => void handleApply()}
          disabled={!poId}
          loading={submitting}
          icon={<FiCheckCircle />}
        >
          Apply
        </Button>
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-success-600">
            SO state: {result.soState}
            {result.sellerBillId ? ` · Seller bill ${result.sellerBillId}` : ''}
            {result.debitNoteId ? ` · Debit note ${result.debitNoteId}` : ''}
            {result.refundId ? ` · Refund ${result.refundId}` : ''}
          </p>
        )}
      </div>
    </Card>
  );
}

function MovementSection() {
  const { callApi } = useAuth();
  const [chainId, setChainId] = useState('');
  const [leg, setLeg] = useState<1 | 2>(1);
  const [mode, setMode] = useState<'transport' | 'bus'>('bus');
  const [transporter, setTransporter] = useState('');
  const [lr, setLr] = useState('');
  const [busNo, setBusNo] = useState('');
  const [driver, setDriver] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [freightTerms, setFreightTerms] = useState<'prepaid' | 'to_pay'>('to_pay');
  const [freightRupees, setFreightRupees] = useState('0');
  const [result, setResult] = useState<{ movementId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      setResult(
        await callApi((token) =>
          recordMovement(token, chainId, {
            leg,
            mode,
            transporter: mode === 'transport' ? transporter : undefined,
            lr: mode === 'transport' ? lr : undefined,
            busNo: mode === 'bus' ? busNo : undefined,
            driver: mode === 'bus' ? driver : undefined,
            driverMobile: mode === 'bus' ? driverMobile : undefined,
            freightTerms,
            freightAmountPaise: Math.round(Number(freightRupees) * 100),
          }),
        ),
      );
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not record this movement — leg 2 needs a matched Marg invoice first (INV-04).',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Record a dispatch">
      <p className="mb-4 text-sm text-slate-500">
        BR-176 — two dispatch modes, both legs; LR mandatory on transport mode. Leg 2 refuses
        without a matched Marg invoice (INV-04) — no exceptions.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <Input
          id="mv-chain"
          label="Chain ID"
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          required
        />

        <Select
          id="mv-leg"
          label="Leg"
          value={leg}
          onChange={(e) => setLeg(Number(e.target.value) as 1 | 2)}
        >
          <option value={1}>Leg 1 (seller → Indore)</option>
          <option value={2}>Leg 2 (Indore → buyer)</option>
        </Select>

        <Select
          id="mv-mode"
          label="Mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
        >
          <option value="bus">Bus</option>
          <option value="transport">Transport</option>
        </Select>

        {mode === 'transport' ? (
          <>
            <Input
              id="mv-transporter"
              label="Transporter"
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
              required
            />
            <Input
              id="mv-lr"
              label="LR number (mandatory)"
              value={lr}
              onChange={(e) => setLr(e.target.value)}
              required
            />
          </>
        ) : (
          <>
            <Input
              id="mv-bus"
              label="Bus number"
              value={busNo}
              onChange={(e) => setBusNo(e.target.value)}
              required
            />
            <Input
              id="mv-driver"
              label="Driver name"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              required
            />
            <Input
              id="mv-driver-mobile"
              label="Driver mobile"
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value)}
              required
            />
          </>
        )}

        <Select
          id="mv-freight-terms"
          label="Freight"
          value={freightTerms}
          onChange={(e) => setFreightTerms(e.target.value as typeof freightTerms)}
        >
          <option value="to_pay">To pay</option>
          <option value="prepaid">Prepaid</option>
        </Select>
        <Input
          id="mv-freight-amount"
          label="Freight amount (₹)"
          type="number"
          step="0.01"
          value={freightRupees}
          onChange={(e) => setFreightRupees(e.target.value)}
        />

        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && <p className="text-sm text-success-600">Recorded as {result.movementId}.</p>}
        <Button type="submit" loading={submitting} icon={<FiTruck />}>
          Record dispatch
        </Button>
      </form>
    </Card>
  );
}
