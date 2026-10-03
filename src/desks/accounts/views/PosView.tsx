import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { recordReceiptConfirmation } from '../../../api/payment';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { EditBlock } from '../EditBlock';
import { inr } from '../format';
import { MSTATE } from '../model';
import {
  A,
  Back,
  ChainStrip,
  DocLines,
  Empty,
  Gate,
  Kv,
  Lede,
  LogTable,
  Note,
  Pill,
  Sec,
  TapTr,
} from '../ui';
import type { AccountsPo } from '../types';

function poState(
  p: AccountsPo,
  inBatch: boolean,
  hold: string | null,
  payable: boolean,
): { tone: 'urgent' | 'flat' | 'info' | 'ok' | 'wait'; text: string } {
  if (p.failed) return { tone: 'urgent', text: 'seller failed' };
  if (p.paid) return { tone: 'flat', text: 'paid' };
  if (inBatch) return { tone: 'info', text: 'in a batch' };
  if (hold)
    return { tone: hold === 'Accounts confirmation pending' ? 'wait' : 'urgent', text: hold };
  if (payable) return { tone: 'ok', text: 'payable' };
  return { tone: 'wait', text: 'gate open' };
}

export function PosView() {
  const { m } = useAccounts();
  return (
    <>
      <h1 className="page">Purchase orders</h1>
      <Lede>Issued only after the buyer&apos;s money is confirmed.</Lede>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>PO</th>
              <th>Issued</th>
              <th>Seller</th>
              <th>Item</th>
              <th className="num">Qty</th>
              <th className="num">Rate</th>
              <th className="num">Bill total</th>
              <th>Gates</th>
              <th>For</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {m.d.pos.map((p) => {
              const bill = m.billFor(p.id);
              const st = poState(p, m.inBatch(p.key), m.holdOf(p), m.isPayable(p));
              return (
                <TapTr key={p.id} to={`po/${p.id}`}>
                  <td className="mono strong nowrap">{p.id}</td>
                  <td className="mono muted nowrap">{p.date}</td>
                  <td>{m.partyName(p.party)}</td>
                  <td className="muted">{p.lines[0]?.item}</td>
                  <td className="num">{p.lines[0]?.qty}</td>
                  <td className="num">{p.lines[0] ? inr(p.lines[0].ratePaise) : ''}</td>
                  <td className="num strong">
                    {bill ? inr(bill.totalPaise) : <span className="muted">no bill</span>}
                  </td>
                  <td className="gates">
                    {m.gatesOf(p).map((g) => (
                      <Gate key={g.g} ok={g.ok} title={g.g} />
                    ))}
                  </td>
                  <td className="mono muted nowrap">{p.so}</td>
                  <td>
                    <Pill tone={st.tone}>{st.text}</Pill>
                  </td>
                </TapTr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Note>
        <strong>The seller is paid on inspection</strong> — goods at Indore, inspected, his bill in
        hand. We do not wait for our own dispatch, because the buyer&apos;s money is already ours. A
        seller asking to be paid early does not make it payable: the gates are facts, not
        permissions.
      </Note>
    </>
  );
}

export function PoView() {
  const { id = '' } = useParams();
  const { m, can, run, go } = useAccounts();
  const p = m.po(id);
  const [productMatches, setProductMatches] = useState(false);
  const [qtyMatches, setQtyMatches] = useState(false);
  const [confirming, setConfirming] = useState(false);
  if (!p) {
    return (
      <>
        <h1 className="page">Not found</h1>
        <Empty title="No such purchase order" />
      </>
    );
  }
  const s = m.party(p.party);
  const bill = m.billFor(p.id);
  const paid = m.d.bankbook.find((b) => b.kind === 'out' && b.ref === p.id);
  const mv = m.d.movements.filter((x) => x.ref === p.id);
  const bc = m.d.bankChanges.find((x) => x.party === p.party);
  const hold = m.holdOf(p);
  const payable = m.isPayable(p);
  const so = m.so(p.so);
  const threeGates = m.gatesOf(p).every((g) => g.ok);

  return (
    <>
      <Back to="pos" label="Purchase orders" />
      <h1 className="page">{p.id}</h1>
      <Lede>
        <A to={`party/${p.party}`} strong>
          {s?.name ?? '—'}
        </A>{' '}
        · {s?.area} · issued {p.date} · due {p.due}
      </Lede>
      <ChainStrip chainNo={p.chain} here="po" />

      {p.failed && (
        <Note tone="urgent">
          <strong>The seller failed.</strong> He did not dispatch, no alternative supply was found,
          and the buyer is refunded in full. This PO is cancelled and the failure sits on his file.
        </Note>
      )}
      {hold && !p.failed && !p.paid && (
        <Note tone="urgent">
          <strong>Held — {hold.toLowerCase()}.</strong>{' '}
          {bc
            ? 'The seller asked to change his bank account and the call-back has not finished. Nothing goes to the new account, and nothing to the old one either.'
            : 'Nothing is paid on this until the hold is lifted.'}
        </Note>
      )}

      <div className="split">
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 10px' }}>The document</h3>
            <DocLines doc={p} kind="po" />
            <EditBlock
              kind="po"
              doc={p}
              what="The seller, the item, the dates and the bank account are not this desk's to change on a document."
              locked={
                p.paid
                  ? 'Paid. A paid purchase order is not edited.'
                  : p.failed
                    ? 'Cancelled — the seller failed.'
                    : null
              }
            />
          </div>
          <Sec>Everything that happened to it</Sec>
          <LogTable rows={p.log} />
        </div>
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>Gates</h3>
            {m.gatesOf(p).map((g) => (
              <div
                key={g.g}
                className="row"
                style={{ gridTemplateColumns: '24px 1fr', padding: '7px 0' }}
              >
                <Gate ok={g.ok} />
                <div className="rmain" style={{ fontWeight: g.ok ? 600 : 400 }}>
                  {g.g}
                </div>
              </div>
            ))}
            <Note style={{ margin: '10px 0 0' }}>
              {payable ? (
                <>
                  <strong>Inspected and billed — payable now.</strong> We do not wait for our own
                  dispatch.
                </>
              ) : p.paid ? (
                'Already paid.'
              ) : p.failed ? (
                'Cancelled.'
              ) : hold ? (
                <>
                  <strong>Not payable — {hold.toLowerCase()}.</strong>
                </>
              ) : (
                <>
                  <strong>Not payable.</strong> A seller asking to be paid early does not make it
                  payable.
                </>
              )}
            </Note>

            {threeGates && !p.confirmed && !p.paid && !p.failed && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                  Accounts&apos; own check, separate from the dock&apos;s inspection. Once recorded
                  it cannot be changed.
                </div>
                {can(PERMISSIONS.ACCOUNTS_CONFIRM_RECEIPT) ? (
                  <>
                    <label style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <input
                        type="checkbox"
                        checked={productMatches}
                        onChange={(e) => setProductMatches(e.target.checked)}
                      />
                      Product matches
                    </label>
                    <label style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      <input
                        type="checkbox"
                        checked={qtyMatches}
                        onChange={(e) => setQtyMatches(e.target.checked)}
                      />
                      Quantity matches
                    </label>
                    <button
                      type="button"
                      className="btn btn-s btn-p"
                      disabled={confirming || !productMatches || !qtyMatches}
                      onClick={() => {
                        setConfirming(true);
                        void run(
                          (token) =>
                            recordReceiptConfirmation(token, p.key, { productMatches, qtyMatches }),
                          `${p.id} — product and quantity confirmed`,
                        ).finally(() => setConfirming(false));
                      }}
                    >
                      Confirm product &amp; quantity
                    </button>
                    <div className="muted" style={{ fontSize: 11.5, marginTop: 6 }}>
                      If either does not match, do not tick it — raise it with the dock instead.
                    </div>
                  </>
                ) : (
                  <span className="muted">Waiting for Accounts to record this check.</span>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>Seller&apos;s bill</h3>
            {bill ? (
              <>
                <dl className="dl">
                  <Kv k="Number">
                    <span className="mono">{bill.id}</span>
                  </Kv>
                  <Kv k="Date">{bill.date}</Kv>
                  <Kv k="Taxable">{inr(bill.taxablePaise)}</Kv>
                  <Kv k="GST">{inr(bill.gstPaise)}</Kv>
                  <Kv k="Total">
                    <strong>{inr(bill.totalPaise)}</strong>
                  </Kv>
                  <Kv k="He has filed">
                    {bill.filed ? (
                      'yes'
                    ) : (
                      <span style={{ color: 'var(--urgent)' }}>not filed — credit at risk</span>
                    )}
                  </Kv>
                </dl>
                <Note style={{ margin: '10px 0 0' }}>Leg 1 completes on this bill.</Note>
              </>
            ) : (
              <Note tone={p.received ? 'urgent' : undefined} style={{ margin: 0 }}>
                {p.received
                  ? 'Goods are in and no bill has come. Leg 1 is not complete, nothing is payable, and no input credit can be claimed.'
                  : 'Goods have not arrived yet.'}
              </Note>
            )}
          </div>

          {paid && (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Paid</h3>
              <dl className="dl">
                <Kv k="Bank line">
                  <button
                    type="button"
                    className="mono"
                    style={{ all: 'unset', cursor: 'pointer' }}
                    onClick={() => go('bank')}
                  >
                    {paid.id}
                  </button>
                </Kv>
                <Kv k="Date">{paid.date}</Kv>
                <Kv k="Amount">
                  <strong>{inr(paid.amountPaise)}</strong>
                </Kv>
                <Kv k="UTR">
                  <span className="mono">{paid.utr}</span>
                </Kv>
              </dl>
            </div>
          )}

          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>Bought for</h3>
            <dl className="dl">
              <Kv k="Sales order">
                <A to={`so/${p.so}`} mono strong>
                  {p.so}
                </A>
              </Kv>
              <Kv k="Buyer">{so ? m.partyName(so.party) : '—'}</Kv>
              <Kv k="His money">confirmed before this PO was issued</Kv>
            </dl>
          </div>

          {mv.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Goods in</h3>
              {mv.map((x) => (
                <div key={x.id} className="evt">
                  <time>{x.left ?? '—'}</time>
                  <div>
                    {x.what}
                    <div className="muted">
                      {MSTATE[x.state][0]}
                      {x.lr !== '—' ? ` · ${x.lr}` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>The seller</h3>
            <dl className="dl">
              <Kv k="GSTIN">
                <span className="mono">{s?.gstin}</span>
              </Kv>
              <Kv k="Account">
                <span className="mono">{s?.bank}</span>
                {s && s.verified === false ? (
                  <>
                    {' '}
                    <Pill tone="urgent">unverified</Pill>
                  </>
                ) : null}
              </Kv>
              <Kv k="Balance">
                <strong>{inr(m.balanceOf(p.party))}</strong>
              </Kv>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
