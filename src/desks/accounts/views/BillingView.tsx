import { useState } from 'react';
import { ApiError } from '../../../api/errors';
import { keyMargInvoice } from '../../../api/marg';
import { useAuth } from '../../../auth/AuthContext';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { inr, toPaise } from '../format';
import { A, Kv, Lede, Note, Pill, Sec } from '../ui';
import type { AccountsSo } from '../types';

/**
 * Key back what Marg produced. The server compares it to the order (BR-033):
 * agree → booked and the chain moves; disagree → nothing is booked, nothing
 * moves, and there is no override for anyone.
 */
function KeyBack({ so, expected, cta }: { so: AccountsSo; expected: number; cta: string }) {
  const { callApi } = useAuth();
  const { m, can, say, reload } = useAccounts();
  const [invoice, setInvoice] = useState('');
  const [date, setDate] = useState(m.d.today);
  const [value, setValue] = useState('');
  const [eway, setEway] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = can(PERMISSIONS.MARG_KEY);

  async function submit(): Promise<void> {
    setBusy(true);
    try {
      const out = await callApi((token) =>
        keyMargInvoice(token, so.key, {
          margInvoiceNo: invoice.trim(),
          date: new Date(date).toISOString(),
          valuePaise: toPaise(value),
          ewayNo: eway.trim(),
        }),
      );
      if (out.state === 'matched') {
        say(`${so.id} confirmed as billed — checked against ${inr(expected)}`);
      } else {
        say(
          `${so.id}: Marg says ${inr(toPaise(value))}, the order says ${inr(expected)} — it does not agree. Nothing moves.`,
          { error: true },
        );
      }
      await reload();
    } catch (error) {
      say(error instanceof ApiError ? error.message : 'Could not key this invoice.', {
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
        Key back what Marg produced
      </div>
      <dl className="dl">
        <Kv k="Marg invoice number">
          <input
            className="win"
            placeholder="MRG/26-27/____"
            value={invoice}
            onChange={(e) => setInvoice(e.target.value)}
            style={{ width: 200 }}
          />
        </Kv>
        <Kv k="Date">
          <input
            className="win"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Kv>
        <Kv k="Value in Marg">
          <input
            className="win"
            type="number"
            step="0.01"
            placeholder={String(expected / 100)}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            style={{ width: 140 }}
          />
        </Kv>
        <Kv k="E-way bill">
          <input
            className="win"
            placeholder="EWB-________"
            value={eway}
            onChange={(e) => setEway(e.target.value)}
            style={{ width: 200 }}
          />
        </Kv>
      </dl>
      <div className="btnrow" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn btn-s btn-p"
          disabled={
            busy || !allowed || !invoice.trim() || !eway.trim() || !(toPaise(value) > 0) || !date
          }
          onClick={() => void submit()}
        >
          {cta}
        </button>
        {!allowed && (
          <span className="lockmsg" style={{ alignSelf: 'center' }}>
            You cannot key a Marg invoice.
          </span>
        )}
      </div>
    </div>
  );
}

export function BillingView() {
  const { m } = useAccounts();
  const chains = m.allChains();
  const ready = chains.filter((c) => c.so && c.leg1 && !c.marg && !c.failed);
  const queried = chains.filter((c) => c.so && c.marg?.state === 'query');
  const done = m.d.margBills.filter((x) => x.state === 'matched');

  return (
    <>
      <h1 className="page">Billing in Marg</h1>
      <Lede>
        This desk does not raise invoices. Marg does. Here we say what the invoice should be, and
        key back what Marg actually produced.
      </Lede>

      <Note>
        <strong>Marg is the books. This is the trade.</strong> An SO becomes billable when the money
        is in and leg 1 is complete. The accountant raises the invoice and the e-way bill in Marg by
        hand, then keys the number, date, value and e-way bill back here.{' '}
        <strong>If Marg&apos;s figure and the SO differ by more than ₹5, nothing moves.</strong> A
        typo is not something to wave through — it is a lorry that cannot lawfully leave.
      </Note>

      {ready.length > 0 && (
        <>
          <Sec>
            Ready to bill{' '}
            <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
              — {ready.length}
            </span>
          </Sec>
          {ready.map((c) => {
            const so = c.so!;
            return (
              <div key={so.id} className="card">
                <div className="cardhead">
                  <div>
                    <h3>
                      <A to={`so/${so.id}`} mono>
                        {so.id}
                      </A>{' '}
                      · {m.partyName(so.party)}
                    </h3>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {so.lines[0] ? `${so.lines[0].qty} × ${so.lines[0].item}` : ''} · paid in full{' '}
                      {c.payments[0]?.date ?? ''}
                    </div>
                  </div>
                  <div>
                    <Pill tone="urgent">to bill</Pill>
                  </div>
                </div>
                <dl className="dl">
                  <Kv k="Taxable">{inr(so.taxablePaise)}</Kv>
                  <Kv k={`GST at ${m.d.config.gstPct}%`}>{inr(so.gstPaise)}</Kv>
                  <Kv k="Invoice should be">
                    <strong>{inr(c.owed)}</strong>
                  </Kv>
                  <Kv k="Buyer GSTIN">
                    <span className="mono">{m.party(so.party)?.gstin}</span>
                  </Kv>
                </dl>
                <KeyBack so={so} expected={c.owed} cta="Confirm billed" />
              </div>
            );
          })}
        </>
      )}

      {queried.length > 0 && (
        <>
          <Sec>Under query</Sec>
          {queried.map((c) => {
            const so = c.so!;
            const mb = c.marg!;
            const gap = c.owed - mb.valuePaise;
            return (
              <div key={mb.id} className="card">
                <div className="cardhead">
                  <div>
                    <h3>
                      <span className="mono">{mb.id}</span> · {m.partyName(mb.party)}
                    </h3>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      against{' '}
                      <A to={`so/${so.id}`} mono>
                        {so.id}
                      </A>{' '}
                      · keyed by {mb.by} {mb.date}
                    </div>
                  </div>
                  <div>
                    <Pill tone="urgent">does not agree</Pill>
                  </div>
                </div>
                <dl className="dl">
                  <Kv k="The order says">{inr(c.owed)}</Kv>
                  <Kv k="Marg says">
                    <strong>{inr(mb.valuePaise)}</strong>
                  </Kv>
                  <Kv k="Out by">
                    <strong style={{ color: 'var(--urgent)' }}>{inr(Math.abs(gap))}</strong>
                  </Kv>
                  <Kv k="E-way bill">
                    <span className="mono">{mb.eway}</span>
                  </Kv>
                </dl>
                <Note tone="urgent" style={{ margin: '12px 0 0' }}>
                  {mb.note}
                  <div style={{ marginTop: 6 }}>
                    Nothing is booked to the buyer&apos;s ledger, the order stays out of the sales
                    register, and the goods stay in the yard.
                  </div>
                </Note>
                <KeyBack so={so} expected={c.owed} cta="Corrected in Marg — re-confirm" />
              </div>
            );
          })}
        </>
      )}

      <Sec>Billed and agreed</Sec>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Marg invoice</th>
              <th>Date</th>
              <th>Buyer</th>
              <th>SO</th>
              <th className="num">Order says</th>
              <th className="num">Marg says</th>
              <th>E-way bill</th>
              <th>By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {done.map((b) => {
              const s = m.so(b.so);
              return (
                <tr key={b.id}>
                  <td className="mono strong nowrap">{b.id}</td>
                  <td className="mono muted nowrap">{b.date}</td>
                  <td>
                    <A to={`party/${b.party}`}>{m.partyName(b.party)}</A>
                  </td>
                  <td className="mono muted nowrap">
                    <A to={`so/${b.so}`}>{b.so}</A>
                  </td>
                  <td className="num">{s ? inr(s.totalPaise) : '—'}</td>
                  <td className="num strong">{inr(b.valuePaise)}</td>
                  <td className="mono muted">{b.eway}</td>
                  <td className="muted">{b.by}</td>
                  <td>
                    <Pill tone="ok">agrees</Pill>
                  </td>
                </tr>
              );
            })}
            {done.length === 0 && (
              <tr>
                <td colSpan={9} className="muted">
                  Nothing billed and agreed yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
