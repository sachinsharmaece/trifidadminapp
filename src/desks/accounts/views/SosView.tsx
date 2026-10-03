import { useParams } from 'react-router-dom';
import { useAccounts } from '../AccountsContext';
import { EditBlock } from '../EditBlock';
import { inr } from '../format';
import { MSTATE, SOSTATE, URS } from '../model';
import {
  A,
  Back,
  ChainStrip,
  DocLines,
  Empty,
  Kv,
  Lede,
  LogTable,
  Note,
  Pill,
  Sec,
  TapTr,
} from '../ui';

export function SosView() {
  const { m } = useAccounts();
  const live = m.d.sos.filter((s) => s.state !== 'closed');
  return (
    <>
      <h1 className="page">Sales orders</h1>
      <Lede>
        Live orders only. Once one is paid and billed in Marg it leaves this list for the sales
        register.
      </Lede>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>SO</th>
              <th>Date</th>
              <th>Buyer</th>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Value</th>
              <th className="num">Received</th>
              <th>Window</th>
              <th>PO</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {live.map((s) => {
              const c = m.chainOf(s.chain);
              const b = m.party(s.party);
              const line = s.lines[0];
              const [label, tone] = SOSTATE[s.state];
              return (
                <TapTr key={s.id} to={`so/${s.id}`}>
                  <td className="mono strong nowrap">{s.id}</td>
                  <td className="mono muted nowrap">{s.date}</td>
                  <td>
                    {b?.name ?? '—'}
                    <div className="muted" style={{ fontSize: 11 }}>
                      {b?.area}
                    </div>
                  </td>
                  <td className="muted">{line?.item}</td>
                  <td className="num">{line?.qty}</td>
                  <td className="num">{line ? inr(line.ratePaise) : ''}</td>
                  <td className="num strong">{inr(s.totalPaise)}</td>
                  <td className={`num ${c.paid ? '' : 'muted'}`}>{c.paid ? inr(c.paid) : '—'}</td>
                  <td>
                    {s.leftH > 0 ? (
                      <Pill tone={s.leftH <= 4 ? 'urgent' : 'wait'}>{s.leftH}h left</Pill>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="mono muted nowrap">
                    {s.po ?? <span className="muted">after payment</span>}
                  </td>
                  <td>
                    <Pill tone={tone}>{label}</Pill>
                  </td>
                </TapTr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Note>
        The PO column is empty until the money is in. That is the rule, not a gap in the data — we
        do not commit to a seller on a promise. A buyer&apos;s rate here includes GST.
      </Note>
    </>
  );
}

export function SoView() {
  const { id = '' } = useParams();
  const { m } = useAccounts();
  const s = m.so(id);
  if (!s) {
    return (
      <>
        <h1 className="page">Not found</h1>
        <Empty title="No such sales order" />
      </>
    );
  }
  const p = m.party(s.party);
  const c = m.chainOf(s.chain);
  const mv = m.d.movements.filter((x) => x.ref === s.id);
  const rf = m.d.refunds.find((r) => r.so === s.id);
  const [stateLabel] = SOSTATE[s.state];
  const poHold = c.po ? m.holdOf(c.po) : null;

  return (
    <>
      <Back to="sos" label="Sales orders" />
      <h1 className="page">{s.id}</h1>
      <Lede>
        <A to={`party/${s.party}`} strong>
          {p?.name ?? '—'}
        </A>{' '}
        · {p?.area} · raised {s.date} · {stateLabel.toLowerCase()}
      </Lede>
      <ChainStrip chainNo={s.chain} here="so" />

      {s.leftH > 0 && (
        <Note tone={s.leftH <= 4 ? 'urgent' : 'wait'}>
          <strong>{s.leftH} hours left of the payment window.</strong> The seller is locked for the
          same {m.d.config.sellerLockH} hours. If the money does not land, this cancels, his lock
          releases, and it is a strike on the buyer.
        </Note>
      )}

      {c.failed && (
        <Note tone="urgent">
          <strong>The seller failed after his PO was issued.</strong> We held the buyer&apos;s
          money, no alternative supply was found, and{' '}
          {rf ? `${inr(rf.amountPaise)} is being refunded in full` : 'a refund is due'}.
          {c.po ? ` The failure is recorded against ${m.partyName(c.po.party)}.` : ''}
        </Note>
      )}

      {s.state === 'ready_to_bill' && (
        <Note tone="urgent">
          <strong>Ready to bill in Marg.</strong> Paid, goods in, inspected. Expected value{' '}
          {inr(c.owed)}. Nothing dispatches until the invoice and the e-way bill exist — that is the
          law, not our preference.
          <BillingButton />
        </Note>
      )}

      {c.marg?.state === 'query' && (
        <Note tone="urgent">
          <strong>Marg and this order do not agree.</strong> Marg says {inr(c.marg.valuePaise)}, the
          order says {inr(c.owed)} — {inr(Math.abs(c.owed - c.marg.valuePaise))} out. Nothing is
          booked and nothing moves until it is corrected in Marg and re-confirmed.
        </Note>
      )}

      <div className="split">
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 10px' }}>The document</h3>
            <DocLines doc={s} kind="so" />
            <EditBlock
              kind="so"
              doc={s}
              what="The buyer, the item and the dates are what he agreed to — changing those makes it a different order and it goes back to Sales."
              locked={
                s.state === 'closed'
                  ? 'Closed and in the sales register. Not editable.'
                  : c.marg
                    ? 'Billed in Marg. Correct it in Marg first, then re-confirm here.'
                    : null
              }
            />
          </div>
          <Sec>Everything that happened to it</Sec>
          <LogTable rows={s.log} />
        </div>
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>Money</h3>
            <dl className="dl">
              <Kv k="Order value">{inr(c.owed)}</Kv>
              <Kv k="Received">{c.paid ? inr(c.paid) : 'nothing yet'}</Kv>
              <Kv k="Short">
                {c.short ? (
                  <strong style={{ color: 'var(--urgent)' }}>{inr(c.short)}</strong>
                ) : (
                  'nil'
                )}
              </Kv>
              <Kv k="Billed in Marg">
                {c.marg ? (
                  <>
                    <span className="mono">{c.marg.id}</span> · {inr(c.marg.valuePaise)}
                    {c.marg.state === 'query' ? (
                      <>
                        {' '}
                        <Pill tone="urgent">query</Pill>
                      </>
                    ) : null}
                  </>
                ) : (
                  'not yet'
                )}
              </Kv>
              {c.marg ? (
                <Kv k="E-way bill">
                  <span className="mono">{c.marg.eway}</span>
                </Kv>
              ) : null}
            </dl>
            {c.payments.map((b) => (
              <div key={b.key} className="evt">
                <time>{b.date}</time>
                <div>
                  {inr(b.amountPaise)}
                  <div className="muted mono">
                    {b.id} · {b.utr}
                  </div>
                </div>
              </div>
            ))}
            {c.upcoming.map((u) => (
              <div key={u.key} className="evt">
                <time>{u.saidAt.slice(0, 10)}</time>
                <div>
                  {inr(u.amountPaise)} claimed
                  <div className="muted">
                    {URS[u.state][0]} · {u.pickedBy}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {c.po ? (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Bought from</h3>
              <dl className="dl">
                <Kv k="Purchase order">
                  <A to={`po/${c.po.id}`} mono strong>
                    {c.po.id}
                  </A>
                </Kv>
                <Kv k="Seller">{m.partyName(c.po.party)}</Kv>
                <Kv k="Issued">{c.po.date} — after the money</Kv>
                <Kv k="State">
                  {c.po.failed
                    ? 'failed'
                    : c.po.paid
                      ? 'paid'
                      : (poHold ?? (m.isPayable(c.po) ? 'payable' : 'gate open'))}
                </Kv>
              </dl>
            </div>
          ) : (
            <Note tone="wait">
              <strong>No purchase order yet.</strong> One is issued the moment the money is
              confirmed, and not a minute before.
            </Note>
          )}

          {mv.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Goods out</h3>
              {mv.map((x) => (
                <div key={x.id} className="evt">
                  <time>{x.left ?? 'not gone'}</time>
                  <div>
                    {x.what}
                    <div className="muted">
                      {MSTATE[x.state][0]}
                      {x.lr !== '—' ? ` · ${x.lr}` : ''}
                    </div>
                    {x.note ? <div className="muted">{x.note}</div> : null}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>The buyer</h3>
            <dl className="dl">
              <Kv k="GSTIN">
                <span className="mono">{p?.gstin}</span>
              </Kv>
              <Kv k="Account on file">
                <span className="mono">{p?.bank}</span>
              </Kv>
              <Kv k="Balance">
                <strong>{inr(m.balanceOf(s.party))}</strong>
                {m.balanceOf(s.party) < 0 ? ' — his advance' : ''}
              </Kv>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}

function BillingButton() {
  const { go } = useAccounts();
  return (
    <div className="btnrow" style={{ marginTop: 8 }}>
      <button type="button" className="btn btn-s btn-p" onClick={() => go('billing')}>
        Billing
      </button>
    </div>
  );
}
