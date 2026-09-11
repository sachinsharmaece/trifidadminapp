import { useState } from 'react';
import type { FormEvent } from 'react';
import { applyInspection, recordInspection } from '../../api/dock';
import { recordMovement } from '../../api/movement';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';

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
    <main>
      <h1>Dock &amp; movements</h1>
      <InspectionSection />
      <ApplyInspectionSection />
      <MovementSection />
    </main>
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
    <section>
      <h2>Record an inspection</h2>
      <p className="note">
        BR-182 — outer box only: case count, visible damage, leakage, batch and expiry against the
        PO. BR-184 — immutable once submitted; the dock head signs by submitting this.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="in-po">PO ID</label>
        <input id="in-po" value={poId} onChange={(e) => setPoId(e.target.value)} required />

        <label htmlFor="in-accepted">Cases accepted</label>
        <input
          id="in-accepted"
          type="number"
          min={0}
          value={casesAccepted}
          onChange={(e) => setCasesAccepted(Number(e.target.value))}
          required
        />

        <label htmlFor="in-rejected">Cases rejected</label>
        <input
          id="in-rejected"
          type="number"
          min={0}
          value={casesRejected}
          onChange={(e) => setCasesRejected(Number(e.target.value))}
          required
        />

        <fieldset>
          <legend>Rejection reasons (fixed codes)</legend>
          {REASON_CODES.map((code) => (
            <label key={code} className="checkbox-row">
              <input
                type="checkbox"
                checked={reasons.includes(code)}
                onChange={() => toggleReason(code)}
              />
              {code.replaceAll('_', ' ')}
            </label>
          ))}
        </fieldset>

        <label htmlFor="in-photo">Photo reference</label>
        <input
          id="in-photo"
          value={photoRef}
          onChange={(e) => setPhotoRef(e.target.value)}
          required
        />

        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {result && <p className="note">Recorded as {result.inspectionId}.</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit inspection'}
        </button>
      </form>
    </section>
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
    <section>
      <h2>Apply the inspection (Purchase)</h2>
      <p className="note">
        BR-190 — the dock records; Purchase converts the finding into a payment consequence: a
        seller bill on the accepted quantity (Q5a), a debit note for any rejected value (Q5b), or,
        on a whole-lot rejection, a supply failure with a full refund (BR-186).
      </p>
      <label htmlFor="ap-po">PO ID</label>
      <input id="ap-po" value={poId} onChange={(e) => setPoId(e.target.value)} />
      <button type="button" onClick={() => void handleApply()} disabled={!poId || submitting}>
        {submitting ? 'Applying…' : 'Apply'}
      </button>
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      {result && (
        <p className="note">
          SO state: {result.soState}
          {result.sellerBillId ? ` · Seller bill ${result.sellerBillId}` : ''}
          {result.debitNoteId ? ` · Debit note ${result.debitNoteId}` : ''}
          {result.refundId ? ` · Refund ${result.refundId}` : ''}
        </p>
      )}
    </section>
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
    <section>
      <h2>Record a dispatch</h2>
      <p className="note">
        BR-176 — two dispatch modes, both legs; LR mandatory on transport mode. Leg 2 refuses
        without a matched Marg invoice (INV-04) — no exceptions.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="mv-chain">Chain ID</label>
        <input
          id="mv-chain"
          value={chainId}
          onChange={(e) => setChainId(e.target.value)}
          required
        />

        <label htmlFor="mv-leg">Leg</label>
        <select id="mv-leg" value={leg} onChange={(e) => setLeg(Number(e.target.value) as 1 | 2)}>
          <option value={1}>Leg 1 (seller → Indore)</option>
          <option value={2}>Leg 2 (Indore → buyer)</option>
        </select>

        <label htmlFor="mv-mode">Mode</label>
        <select id="mv-mode" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
          <option value="bus">Bus</option>
          <option value="transport">Transport</option>
        </select>

        {mode === 'transport' ? (
          <>
            <label htmlFor="mv-transporter">Transporter</label>
            <input
              id="mv-transporter"
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
              required
            />
            <label htmlFor="mv-lr">LR number (mandatory)</label>
            <input id="mv-lr" value={lr} onChange={(e) => setLr(e.target.value)} required />
          </>
        ) : (
          <>
            <label htmlFor="mv-bus">Bus number</label>
            <input id="mv-bus" value={busNo} onChange={(e) => setBusNo(e.target.value)} required />
            <label htmlFor="mv-driver">Driver name</label>
            <input
              id="mv-driver"
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              required
            />
            <label htmlFor="mv-driver-mobile">Driver mobile</label>
            <input
              id="mv-driver-mobile"
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value)}
              required
            />
          </>
        )}

        <label htmlFor="mv-freight-terms">Freight</label>
        <select
          id="mv-freight-terms"
          value={freightTerms}
          onChange={(e) => setFreightTerms(e.target.value as typeof freightTerms)}
        >
          <option value="to_pay">To pay</option>
          <option value="prepaid">Prepaid</option>
        </select>
        <label htmlFor="mv-freight-amount">Freight amount (₹)</label>
        <input
          id="mv-freight-amount"
          type="number"
          step="0.01"
          value={freightRupees}
          onChange={(e) => setFreightRupees(e.target.value)}
        />

        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {result && <p className="note">Recorded as {result.movementId}.</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Recording…' : 'Record dispatch'}
        </button>
      </form>
    </section>
  );
}
