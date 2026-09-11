import { useState } from 'react';
import type { FormEvent } from 'react';
import { keyMargInvoice } from '../../api/marg';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';

/**
 * WF-08 — billing in Marg is a desk queue, not a background job. The
 * operator raises the invoice and e-way bill in Marg itself, then keys the
 * number, date, value and e-way number back here. BR-033 — match books the
 * bill and advances the chain; mismatch queries, books nothing anywhere,
 * and the chain stops. **There is no override control on this screen**, for
 * any role, including the Controller (CH §22.9) — the form below has no
 * field that could carry one.
 */
export function MargDeskPage() {
  const { callApi } = useAuth();
  const [soId, setSoId] = useState('');
  const [margInvoiceNo, setMargInvoiceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [valueRupees, setValueRupees] = useState('');
  const [ewayNo, setEwayNo] = useState('');
  const [result, setResult] = useState<{ margBillId: string; state: 'matched' | 'query' } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const outcome = await callApi((token) =>
        keyMargInvoice(token, soId, {
          margInvoiceNo,
          date: new Date(date).toISOString(),
          valuePaise: Math.round(Number(valueRupees) * 100),
          ewayNo,
        }),
      );
      setResult(outcome);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not key this invoice.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Billing in Marg</h1>
      <p className="note">
        Raise the invoice and e-way bill in Marg first, then key the figures back here. A ₹5
        difference from the SO total auto-matches (BR-033/Q3b); anything more queries and stops the
        chain — there is no way to force it through from this screen.
      </p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="mg-so">SO ID</label>
        <input id="mg-so" value={soId} onChange={(e) => setSoId(e.target.value)} required />

        <label htmlFor="mg-invoice">Marg invoice number</label>
        <input
          id="mg-invoice"
          value={margInvoiceNo}
          onChange={(e) => setMargInvoiceNo(e.target.value)}
          required
        />

        <label htmlFor="mg-date">Date</label>
        <input
          id="mg-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <label htmlFor="mg-value">Invoice value (₹)</label>
        <input
          id="mg-value"
          type="number"
          step="0.01"
          value={valueRupees}
          onChange={(e) => setValueRupees(e.target.value)}
          required
        />

        <label htmlFor="mg-eway">E-way bill number</label>
        <input id="mg-eway" value={ewayNo} onChange={(e) => setEwayNo(e.target.value)} required />

        {error && (
          <p className="note-urgent" role="alert">
            {error}
          </p>
        )}
        {result && (
          <p
            className={result.state === 'matched' ? 'note' : 'note-urgent'}
            role={result.state === 'query' ? 'alert' : undefined}
          >
            {result.state === 'matched'
              ? `Matched (${result.margBillId}). Chain advances to dispatch.`
              : `Query (${result.margBillId}). Books nothing anywhere — the chain stops here (BR-033).`}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Keying…' : 'Key invoice'}
        </button>
      </form>
    </main>
  );
}
