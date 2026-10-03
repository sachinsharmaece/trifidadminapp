import { useParams } from 'react-router-dom';
import { logBankDetailCallback } from '../../../api/payment';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { inr } from '../format';
import { SOSTATE, URS } from '../model';
import { A, Back, Empty, Kv, Lede, Note, Pill, TapTr } from '../ui';
import type { AccountsParty } from '../types';

function PartyTable({ list, kind }: { list: AccountsParty[]; kind: 'buyer' | 'seller' }) {
  const { m } = useAccounts();
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Area</th>
            <th>GSTIN</th>
            <th>Account</th>
            <th className="num">{kind === 'buyer' ? 'Billed' : 'His bills'}</th>
            <th className="num">{kind === 'buyer' ? 'Money in' : 'Paid'}</th>
            <th className="num">Balance</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((p) => {
            const l = m.ledger(p.id);
            const up = l.reduce((n, r) => n + (kind === 'buyer' ? r.dr : r.cr), 0);
            const dn = l.reduce((n, r) => n + (kind === 'buyer' ? r.cr : r.dr), 0);
            const b = m.balanceOf(p.id);
            return (
              <TapTr key={p.id} to={`party/${p.id}`}>
                <td className="strong">
                  {p.name}
                  <div className="muted" style={{ fontWeight: 400 }}>
                    {p.person}
                  </div>
                </td>
                <td className="muted">{p.area}</td>
                <td className="mono muted">{p.gstin}</td>
                <td className="mono muted">
                  {p.bank}
                  {p.verified === false ? (
                    <>
                      {' '}
                      <span style={{ color: 'var(--urgent)' }}>unverified</span>
                    </>
                  ) : null}
                </td>
                <td className="num">{inr(up)}</td>
                <td className="num muted">{inr(dn)}</td>
                <td className="num strong">{inr(b)}</td>
                <td>
                  {b > 0 ? (
                    <Pill tone="urgent">{kind === 'buyer' ? 'owes us' : 'we owe'}</Pill>
                  ) : b < 0 ? (
                    <Pill tone="wait">advance {inr(-b)}</Pill>
                  ) : (
                    <Pill tone="ok">square</Pill>
                  )}
                </td>
              </TapTr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={6} className="strong">
              Total
            </td>
            <td className="num strong">{inr(list.reduce((n, p) => n + m.balanceOf(p.id), 0))}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function BuyersView() {
  const { m } = useAccounts();
  return (
    <>
      <h1 className="page">Buyers</h1>
      <Lede>What each one has been billed in Marg, what he has paid, and what is left.</Lede>
      <PartyTable list={m.buyers()} kind="buyer" />
      <Note tone="wait">
        <strong>The balances are negative and that is the model working.</strong> Money comes before
        the bill, so a buyer is normally in credit with us — {inr(m.totalAdvances())} of advances. A
        positive balance would mean we had billed somebody who had not paid, which cannot happen
        here.
      </Note>
    </>
  );
}

export function SellersView() {
  const { m } = useAccounts();
  return (
    <>
      <h1 className="page">Sellers</h1>
      <Lede>What each one has billed us and what we have paid.</Lede>
      <PartyTable list={m.sellers()} kind="seller" />
      <Note>
        Goods received with no bill are not in these balances. A debt exists when it is billed, not
        when the lorry arrives — and until then there is no input credit either.
      </Note>
    </>
  );
}

export function PartyView() {
  const { id = '' } = useParams();
  const { m, can, run } = useAccounts();
  const p = m.party(id);
  if (!p) {
    return (
      <>
        <h1 className="page">Not found</h1>
        <Empty title="No such party" />
      </>
    );
  }
  const d = m.d;
  const l = m.ledger(id);
  const isBuyer = p.type === 'buyer';
  const bal = m.balanceOf(id);
  const docs = isBuyer ? d.sos.filter((s) => s.party === id) : d.pos.filter((x) => x.party === id);
  const bc = d.bankChanges.filter((x) => x.party === id);
  const fails = d.pos.filter((x) => x.party === id && x.failed);
  const ups = d.upcoming.filter((u) => u.party === id);

  return (
    <>
      <Back to={isBuyer ? 'buyers' : 'sellers'} label={isBuyer ? 'Buyers' : 'Sellers'} />
      <h1 className="page">{p.name}</h1>
      <Lede>
        {p.person} · {p.area} · {isBuyer ? 'buyer' : 'seller'} since {p.since}
      </Lede>

      {isBuyer && bal < 0 && (
        <Note tone="wait">
          <strong>{inr(-bal)} of his money is with us.</strong> He has paid against orders not yet
          billed in Marg. It is his until then.
        </Note>
      )}
      {fails.length > 0 && (
        <Note tone="urgent">
          <strong>
            {fails.length} supply failure{fails.length === 1 ? '' : 's'}.
          </strong>{' '}
          {fails
            .map(
              (f) => `${f.id} — did not dispatch after the PO was issued, buyer refunded in full`,
            )
            .join('; ')}
          . This is the record that should decide whether he gets the next order.
        </Note>
      )}

      <div className="split">
        <div>
          <h2 className="sec">Ledger</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Document</th>
                  <th>What</th>
                  <th className="num">{isBuyer ? 'Billed' : 'Paid'}</th>
                  <th className="num">{isBuyer ? 'Received' : 'Billed'}</th>
                  <th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={5} className="strong">
                    Opening
                  </td>
                  <td className="num strong">{inr(p.openingPaise)}</td>
                </tr>
                {l.map((r, i) => (
                  <tr key={i}>
                    <td className="mono muted nowrap">{r.date}</td>
                    <td className="mono strong">
                      <A to={r.link}>{r.doc}</A>
                    </td>
                    <td className="muted">{r.what}</td>
                    <td className="num">{r.dr ? inr(r.dr) : ''}</td>
                    <td className="num">{r.cr ? inr(r.cr) : ''}</td>
                    <td className="num strong">{inr(r.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="strong">
                    Closing
                  </td>
                  <td className="num strong">{inr(bal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <Note>
            Nothing here is typed. It is built from the Marg bills, the sellers&apos; bills and the
            bank book, which is why it cannot disagree with them.
          </Note>

          <h2 className="sec">{isBuyer ? 'Sales orders' : 'Purchase orders'}</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Date</th>
                  <th>Item</th>
                  <th className="num">Qty</th>
                  <th className="num">Value</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((x) => {
                  const hold = 'key' in x && 'payablePaise' in x ? m.holdOf(x) : null;
                  return (
                    <TapTr key={x.id} to={`${isBuyer ? 'so' : 'po'}/${x.id}`}>
                      <td className="mono strong nowrap">{x.id}</td>
                      <td className="mono muted nowrap">{x.date}</td>
                      <td className="muted">{x.lines[0]?.item}</td>
                      <td className="num">{x.lines[0]?.qty}</td>
                      <td className="num strong">{inr(x.totalPaise)}</td>
                      <td>
                        {'state' in x ? (
                          <Pill tone={SOSTATE[x.state][1]}>{SOSTATE[x.state][0]}</Pill>
                        ) : x.failed ? (
                          <Pill tone="urgent">failed</Pill>
                        ) : x.paid ? (
                          <Pill tone="flat">paid</Pill>
                        ) : hold ? (
                          <Pill tone="urgent">{hold}</Pill>
                        ) : m.isPayable(x) ? (
                          <Pill tone="ok">payable</Pill>
                        ) : (
                          <Pill tone="wait">gate open</Pill>
                        )}
                      </td>
                    </TapTr>
                  );
                })}
                {docs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="muted">
                      None in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <div className="card">
            <h3 style={{ margin: '0 0 8px' }}>The file</h3>
            <dl className="dl">
              <Kv k="GSTIN">
                <span className="mono">{p.gstin}</span>
              </Kv>
              <Kv k="Account on file">
                <span className="mono">{p.bank}</span>
              </Kv>
              <Kv k="Mobile">
                <span className="mono">{p.mobile}</span>
              </Kv>
              <Kv k="Balance now">
                <strong>{inr(bal)}</strong>
              </Kv>
            </dl>
          </div>
          {ups.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Says he has sent</h3>
              {ups.map((u) => (
                <div key={u.key} className="evt">
                  <time>{u.saidAt.slice(0, 10)}</time>
                  <div>
                    {inr(u.amountPaise)} for {u.sos.join(', ') || 'orders not picked yet'}
                    <div className="muted">{URS[u.state][0]}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {bc.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 8px' }}>Bank account changes</h3>
              {bc.map((x) => (
                <div key={x.id} className="evt">
                  <time>{x.asked.slice(0, 10)}</time>
                  <div>
                    {x.old} → {x.new}
                    <div className="muted">
                      {x.callback
                        ? `call-back done${x.effectiveFrom ? ` · payable from ${x.effectiveFrom}` : ''}`
                        : 'call-back NOT done'}
                    </div>
                  </div>
                </div>
              ))}
              {bc.some((x) => !x.callback) && (
                <Note tone="urgent" style={{ margin: '10px 0 0' }}>
                  <strong>Nothing is paid until the call-back is done</strong> — to the number
                  already on file, never the number on the request.
                  {can(PERMISSIONS.BANK_DETAIL_WRITE) && (
                    <div className="btnrow" style={{ marginTop: 8 }}>
                      {bc
                        .filter((x) => !x.callback)
                        .map((x) => (
                          <button
                            key={x.id}
                            type="button"
                            className="btn btn-s btn-p"
                            onClick={() =>
                              void run(
                                (token) => logBankDetailCallback(token, x.key),
                                `Call-back logged — ${m.d.config.callbackCoolingH}h cooling starts`,
                              )
                            }
                          >
                            Log the call-back
                          </button>
                        ))}
                    </div>
                  )}
                </Note>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
