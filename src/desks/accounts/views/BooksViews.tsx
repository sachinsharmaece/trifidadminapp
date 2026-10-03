import { markSellerBillFiled, runDayClose } from '../../../api/payment';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { inr, toPaise } from '../format';
import { MSTATE } from '../model';
import { A, Kpi, Kv, Lede, Note, Pill } from '../ui';
import { NotYet } from './UpcomingView';
import type { AccountsMovement } from '../types';

export function RegisterView() {
  const { m } = useAccounts();
  const done = m.d.margBills.filter((x) => x.state === 'matched');
  const total = done.reduce((n, x) => n + x.valuePaise, 0);
  const held = m.allChains().filter((c) => c.so && c.leg1 && !c.billed && !c.failed);

  return (
    <>
      <h1 className="page">Sales register</h1>
      <Lede>Orders that are paid, billed in Marg and closed. Revenue recognised.</Lede>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Marg invoice</th>
              <th>Date</th>
              <th>Buyer</th>
              <th>SO</th>
              <th>Goods</th>
              <th className="num">Taxable</th>
              <th className="num">GST</th>
              <th className="num">Total</th>
              <th>E-way bill</th>
            </tr>
          </thead>
          <tbody>
            {done.map((x) => {
              const s = m.so(x.so);
              return (
                <tr key={x.id}>
                  <td className="mono strong nowrap">{x.id}</td>
                  <td className="mono muted nowrap">{x.date}</td>
                  <td>
                    <A to={`party/${x.party}`}>{m.partyName(x.party)}</A>
                  </td>
                  <td className="mono muted nowrap">
                    <A to={`so/${x.so}`}>{x.so}</A>
                  </td>
                  <td className="muted">
                    {s?.lines[0] ? `${s.lines[0].qty} × ${s.lines[0].item}` : ''}
                  </td>
                  <td className="num">{s ? inr(s.taxablePaise) : '—'}</td>
                  <td className="num muted">{s ? inr(s.gstPaise) : '—'}</td>
                  <td className="num strong">{inr(x.valuePaise)}</td>
                  <td className="mono muted">{x.eway}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="strong">
                Revenue recognised
              </td>
              <td className="num strong">{inr(total)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {held.length > 0 && (
        <Note tone="urgent">
          <strong>
            {held.length} paid order{held.length === 1 ? ' is' : 's are'} not in this register yet.
          </strong>{' '}
          {held
            .map(
              (c) =>
                `${c.so!.id} · ${inr(c.owed)}${c.marg ? ' — Marg value under query' : ' — not billed'}`,
            )
            .join('; ')}
          . That is {inr(held.reduce((n, c) => n + c.owed, 0))} of revenue sitting behind a billing
          step.
        </Note>
      )}
    </>
  );
}

export function PurchasesView() {
  const { m } = useAccounts();
  const d = m.d;
  const sum = (k: 'taxablePaise' | 'gstPaise' | 'totalPaise') =>
    d.bills.reduce((n, b) => n + b[k], 0);
  const nobill = d.pos.filter((p) => p.received && !p.billed);
  return (
    <>
      <h1 className="page">Purchase register</h1>
      <Lede>Sellers&apos; bills booked. Leg 1 completes when one of these lands.</Lede>
      {nobill.length > 0 && (
        <Note tone="urgent">
          <strong>{nobill.length} received and not billed.</strong>{' '}
          {nobill.map((p) => `${p.id} · ${m.partyName(p.party)}`).join('; ')}. Leg 1 incomplete, not
          payable, no input credit, and not in the seller&apos;s balance.
        </Note>
      )}
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Bill</th>
              <th>Date</th>
              <th>Seller</th>
              <th>PO</th>
              <th className="num">Taxable</th>
              <th className="num">GST</th>
              <th className="num">Total</th>
              <th>He has filed</th>
            </tr>
          </thead>
          <tbody>
            {d.bills.map((b) => (
              <tr key={b.key}>
                <td className="mono strong nowrap">{b.id}</td>
                <td className="mono muted nowrap">{b.date}</td>
                <td>
                  <A to={`party/${b.party}`}>{m.partyName(b.party)}</A>
                </td>
                <td className="mono muted nowrap">
                  <A to={`po/${b.po}`}>{b.po}</A>
                </td>
                <td className="num">{inr(b.taxablePaise)}</td>
                <td className="num muted">{inr(b.gstPaise)}</td>
                <td className="num strong">{inr(b.totalPaise)}</td>
                <td>
                  {b.filed ? <Pill tone="ok">filed</Pill> : <Pill tone="urgent">not filed</Pill>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="strong">
                Booked
              </td>
              <td className="num strong">{inr(sum('taxablePaise'))}</td>
              <td className="num strong">{inr(sum('gstPaise'))}</td>
              <td className="num strong">{inr(sum('totalPaise'))}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

function MovementTable({ rows }: { rows: AccountsMovement[] }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Movement</th>
            <th>Against</th>
            <th>Goods</th>
            <th>Counterparty</th>
            <th>LR</th>
            <th>Left</th>
            <th>Due</th>
            <th>State</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x) => (
            <tr key={x.id}>
              <td className="mono strong nowrap">{x.id}</td>
              <td className="mono muted nowrap">
                <A to={`${x.leg === 1 ? 'po' : 'so'}/${x.ref}`}>{x.ref}</A>
              </td>
              <td>{x.what}</td>
              <td className="muted">{x.counter}</td>
              <td className="mono muted">{x.lr}</td>
              <td className="mono muted nowrap">{x.left ?? '—'}</td>
              <td className="mono muted nowrap">{x.due ?? '—'}</td>
              <td>
                <Pill tone={MSTATE[x.state][1]}>{MSTATE[x.state][0]}</Pill>
                {x.note ? (
                  <div className="muted" style={{ fontSize: 11 }}>
                    {x.note}
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="muted">
                Nothing on this leg.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MovementsView() {
  const { m } = useAccounts();
  const leg = (n: 1 | 2) => m.d.movements.filter((x) => x.leg === n);
  const held = m.d.movements.filter((x) => x.state === 'held');
  return (
    <>
      <h1 className="page">Goods movement</h1>
      <Lede>
        What Accounts needs and no more. The transporter, the delays, the freight and the damage are
        the Logistics desk&apos;s work, not this one&apos;s.
      </Lede>
      <h2 className="sec">Leg 1 — seller to Indore</h2>
      <MovementTable rows={leg(1)} />
      <Note>
        Arrival here is the first gate on the purchase order — the same flag, not a second one.
      </Note>
      <h2 className="sec">Leg 2 — Indore to the buyer</h2>
      <MovementTable rows={leg(2)} />
      {held.length > 0 && (
        <Note tone="urgent">
          <strong>
            {held.length} consignment{held.length === 1 ? ' is' : 's are'} held.
          </strong>{' '}
          Goods cannot lawfully move without an invoice and an e-way bill — so a Marg step that has
          not been done, or a Marg value that does not agree, stops a lorry.
        </Note>
      )}
    </>
  );
}

export function GstView() {
  const { m, can, run } = useAccounts();
  const d = m.d;
  const unfiled = d.bills.filter((b) => !b.filed);
  const lost = unfiled.reduce((n, b) => n + b.gstPaise, 0);
  const all = d.bills.reduce((n, b) => n + b.gstPaise, 0);
  const out = d.margBills
    .filter((x) => x.state === 'matched')
    .reduce((n, x) => n + (m.so(x.so)?.gstPaise ?? 0), 0);

  return (
    <>
      <h1 className="page">GST credit</h1>
      <Lede>Output tax on what Marg has billed, input credit on what sellers have billed us.</Lede>
      <div className="kpis">
        <Kpi value={inr(out)} label="Output tax" small="on Marg invoices that agree" />
        <Kpi value={inr(all)} label="Input credit" small="on sellers' bills booked" />
        <Kpi hot={lost > 0} value={inr(lost)} label="At risk" small="seller has not filed" />
        <Kpi
          value={inr(Math.max(0, out - (all - lost)))}
          label="Net if nothing changes"
          small="output less safe credit"
        />
      </div>
      {lost > 0 && (
        <Note tone="urgent">
          <strong>
            {inr(lost)} depends on {unfiled.length} seller{unfiled.length === 1 ? '' : 's'} filing.
          </strong>{' '}
          If he does not file we cannot claim, and it is our money that is gone — not his. Chase it
          while his payment is still in our hands.
        </Note>
      )}
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Bill</th>
              <th>Seller</th>
              <th>GSTIN</th>
              <th className="num">Taxable</th>
              <th className="num">Credit</th>
              <th>Filed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {d.bills.map((b) => (
              <tr key={b.key}>
                <td className="mono strong nowrap">{b.id}</td>
                <td>
                  <A to={`party/${b.party}`}>{m.partyName(b.party)}</A>
                </td>
                <td className="mono muted">{m.party(b.party)?.gstin}</td>
                <td className="num">{inr(b.taxablePaise)}</td>
                <td className="num strong">{inr(b.gstPaise)}</td>
                <td>
                  {b.filed ? <Pill tone="ok">filed</Pill> : <Pill tone="urgent">not filed</Pill>}
                </td>
                <td>
                  {b.filed ? null : (
                    <div className="btnrow">
                      {can(PERMISSIONS.GST_MARK_FILED) && (
                        <button
                          type="button"
                          className="btn btn-s btn-p"
                          onClick={() =>
                            void run(
                              (token) => markSellerBillFiled(token, b.key),
                              `${b.id} marked filed`,
                            )
                          }
                        >
                          Mark filed
                        </button>
                      )}
                      <NotYet>Chase</NotYet>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CloseView() {
  const { m, can, run, statement, setStatement } = useAccounts();
  const d = m.d;
  const rows = m.bankRows();
  const inSum = rows.filter((r) => r.kind === 'in').reduce((n, r) => n + r.amountPaise, 0);
  const outSum = rows.filter((r) => r.kind === 'out').reduce((n, r) => n + r.amountPaise, 0);
  const refs = d.refunds.reduce((n, r) => n + r.amountPaise, 0);
  const held = m.allChains().filter((c) => c.so && c.leg1 && !c.billed && !c.failed);
  const have = statement.trim() !== '' && !Number.isNaN(toPaise(statement));
  const diff = have ? toPaise(statement) - m.bankClosing() : null;
  const revenue = d.margBills
    .filter((x) => x.state === 'matched')
    .reduce((n, x) => n + x.valuePaise, 0);

  return (
    <>
      <h1 className="page">Day close</h1>
      <Lede>{d.day} · the book against the statement.</Lede>
      <div className="split">
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 10px' }}>The book</h3>
            <dl className="dl">
              <Kv k="Received">{inr(inSum)}</Kv>
              <Kv k="Paid out">−{inr(outSum)}</Kv>
              <Kv k="Closing per the book">
                <strong>{inr(m.bankClosing())}</strong>
              </Kv>
              <Kv k="Bank statement">
                <input
                  className="win"
                  type="number"
                  step="0.01"
                  placeholder="closing balance (₹)"
                  value={statement}
                  onChange={(e) => setStatement(e.target.value)}
                  style={{ width: 180 }}
                />
              </Kv>
              <Kv k="Difference">
                {diff === null ? (
                  '—'
                ) : diff === 0 ? (
                  <span style={{ color: 'var(--brand)' }}>nil</span>
                ) : (
                  <strong style={{ color: 'var(--urgent)' }}>{inr(diff)}</strong>
                )}
              </Kv>
            </dl>
          </div>
          {diff === null ? (
            <Note>Type the statement&apos;s closing balance to compare it with the book.</Note>
          ) : diff === 0 ? (
            <Note tone="ok">
              <strong>It balances.</strong> Close it and it stays closed.
            </Note>
          ) : (
            <Note tone="urgent">
              <strong>Do not close on a difference.</strong>
            </Note>
          )}
          <div className="btnrow" style={{ marginTop: 12 }}>
            <button
              type="button"
              className={`btn btn-s ${diff === 0 ? 'btn-p' : ''}`}
              disabled={diff !== 0 || !can(PERMISSIONS.DAY_CLOSE_RUN)}
              onClick={() =>
                void run(
                  (token) => runDayClose(token, toPaise(statement)),
                  `${d.day} closed at ${inr(m.bankClosing())}`,
                )
              }
            >
              Close the day
            </button>
            {!can(PERMISSIONS.DAY_CLOSE_RUN) && (
              <span className="lockmsg" style={{ alignSelf: 'center' }}>
                Your seat does not close the day.
              </span>
            )}
          </div>

          <h2 className="sec">Does everything tie</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Check</th>
                  <th className="num">Figure</th>
                  <th>Reads against</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="strong">Upcoming — not ours yet</td>
                  <td className="num strong">{inr(m.upcomingTotal())}</td>
                  <td className="muted">buyers say they have sent it; nothing in the bank</td>
                </tr>
                <tr>
                  <td className="strong">Advances held</td>
                  <td className="num strong">{inr(m.totalAdvances())}</td>
                  <td className="muted">
                    paid, not yet billed in Marg — sum of the buyer credit balances
                  </td>
                </tr>
                <tr>
                  <td className="strong">Debtors</td>
                  <td className="num strong">{inr(m.totalDebtors())}</td>
                  <td className="muted">nil by design: Marg bills only after the money</td>
                </tr>
                <tr>
                  <td className="strong">We owe sellers</td>
                  <td className="num strong">{inr(m.totalPayable())}</td>
                  <td className="muted">their bills booked, less what we have paid</td>
                </tr>
                <tr>
                  <td className="strong">Revenue recognised</td>
                  <td className="num strong">{inr(revenue)}</td>
                  <td className="muted">Marg invoices that agree with their orders</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>Held, not earned</h3>
            <dl className="dl">
              <Kv k="Advances">{inr(m.totalAdvances())}</Kv>
              <Kv k="Refunds owed">{inr(refs)}</Kv>
              <Kv k="Together">
                <strong>{inr(m.totalAdvances() + refs)}</strong>
              </Kv>
            </dl>
            <Note style={{ margin: '10px 0 0' }}>
              Somebody else&apos;s money in our account. A liability, never income.
            </Note>
          </div>
          {held.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Stuck at billing</h3>
              <dl className="dl">
                {held.map((c) => (
                  <Kv key={c.so!.id} k={c.so!.id}>
                    {inr(c.owed)}
                    {c.marg ? ' · query' : ' · to bill'}
                  </Kv>
                ))}
              </dl>
              <Note tone="urgent" style={{ margin: '10px 0 0' }}>
                Paid, goods in, and not billed. Revenue that is earned in every sense except the one
                that counts.
              </Note>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
