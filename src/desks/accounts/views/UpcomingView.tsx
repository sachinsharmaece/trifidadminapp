import { Fragment, useState } from 'react';
import { postBankCredit } from '../../../api/payment';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { inr } from '../format';
import { URS } from '../model';
import { A, Kv, Lede, Note, Pill } from '../ui';
import type { AccountsUpcoming } from '../types';

/** A button for something the server cannot do yet. Visible, honest, inert. */
export const NotYet = ({ children }: { children: string }) => (
  <button
    type="button"
    className="btn btn-s"
    disabled
    title="Not available yet — this needs a server change that has not been built."
  >
    {children}
  </button>
);

/**
 * "Post the credit" — the step after the money actually lands: it carries the UTR
 * and the remitter's account (BR-027), and clears the claim into the bank book.
 */
function PostCredit({ u, onDone }: { u: AccountsUpcoming; onDone: () => void }) {
  const { run } = useAccounts();
  const [utr, setUtr] = useState(u.utr === '—' ? '' : u.utr);
  const [account, setAccount] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ padding: '4px 0' }}>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
        Only after you can see it on the bank statement. Post it with the UTR and the account it
        came from.
      </div>
      <dl className="dl" style={{ maxWidth: 520 }}>
        <Kv k="UTR">
          <input
            className="win"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            style={{ width: 220 }}
          />
        </Kv>
        <Kv k="Remitter account number">
          <input
            className="win"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            style={{ width: 220 }}
          />
        </Kv>
        <Kv k="Remitter IFSC">
          <input
            className="win"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value.toUpperCase())}
            style={{ width: 140 }}
          />
        </Kv>
      </dl>
      <div className="btnrow" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="btn btn-s btn-p"
          disabled={busy || !utr.trim() || !account.trim() || !ifsc.trim()}
          onClick={() => {
            setBusy(true);
            void run(
              (token) =>
                postBankCredit(token, u.key, {
                  utr: utr.trim(),
                  remitterAccountNumber: account.trim(),
                  remitterIfsc: ifsc.trim(),
                }),
              `${u.id} posted — ${inr(u.amountPaise)} is in the bank book`,
            ).then((ok) => {
              setBusy(false);
              if (ok) onDone();
            });
          }}
        >
          Post {inr(u.amountPaise)}
        </button>
        <button type="button" className="btn btn-s" onClick={onDone}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function UpcomingView() {
  const { m, can } = useAccounts();
  const [posting, setPosting] = useState<string | null>(null);
  const d = m.d;

  return (
    <>
      <h1 className="page">Upcoming receipts</h1>
      <Lede>What the buyer says he has sent. Not in our bank, not in our books.</Lede>
      <Note>
        <strong>Sales picks the orders, not Accounts.</strong> A buyer may have five orders open and
        be paying for one. The man who knows him says which — so when the money lands it arrives
        already labelled, and this desk never guesses. Nothing here counts until it is in the bank.
      </Note>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Buyer</th>
              <th>Said at</th>
              <th className="num">Amount</th>
              <th>UTR</th>
              <th>Covers</th>
              <th className="num">Those orders</th>
              <th>Picked by</th>
              <th>State</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {d.upcoming.map((u) => {
              const total = u.sos
                .map((id) => m.so(id))
                .filter((s): s is NonNullable<typeof s> => !!s)
                .reduce((n, s) => n + s.totalPaise, 0);
              const open = d.sos.filter(
                (s) => s.party === u.party && s.state === 'awaiting_payment',
              ).length;
              return (
                <Fragment key={u.key}>
                  <tr>
                    <td className="mono strong nowrap">{u.id}</td>
                    <td>
                      <A to={`party/${u.party}`} strong>
                        {m.partyName(u.party)}
                      </A>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {open} orders open
                      </div>
                    </td>
                    <td className="mono muted nowrap">{u.saidAt}</td>
                    <td className="num strong">{inr(u.amountPaise)}</td>
                    <td className="mono muted">{u.utr}</td>
                    <td className="mono">
                      {u.sos.length ? (
                        u.sos.map((x, i) => (
                          <Fragment key={x}>
                            {i > 0 && <br />}
                            <A to={`so/${x}`}>{x}</A>
                          </Fragment>
                        ))
                      ) : (
                        <span className="muted">not picked yet</span>
                      )}
                    </td>
                    <td className={`num ${total === u.amountPaise ? '' : 'strong'}`}>
                      {u.sos.length ? inr(total) : '—'}
                      {u.sos.length > 0 && total !== u.amountPaise ? (
                        <div className="muted" style={{ fontWeight: 400, color: 'var(--urgent)' }}>
                          does not match
                        </div>
                      ) : null}
                    </td>
                    <td className="muted">{u.pickedBy}</td>
                    <td>
                      <Pill tone={URS[u.state][1]}>{URS[u.state][0]}</Pill>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {u.note}
                      </div>
                    </td>
                    <td className="nowrap">
                      <div className="btnrow">
                        {u.sos.length > 0 && can(PERMISSIONS.BANK_POST) && (
                          <button
                            type="button"
                            className="btn btn-s btn-p"
                            onClick={() => setPosting(posting === u.key ? null : u.key)}
                          >
                            Post credit
                          </button>
                        )}
                        {u.state === 'landed_wrong_account' ? (
                          <NotYet>Ask Sales</NotYet>
                        ) : (
                          <NotYet>Chase</NotYet>
                        )}
                      </div>
                    </td>
                  </tr>
                  {posting === u.key && (
                    <tr className="sub">
                      <td colSpan={10}>
                        <PostCredit u={u} onDone={() => setPosting(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {d.upcoming.length === 0 && (
              <tr>
                <td colSpan={10} className="muted">
                  Nothing waiting.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Note tone="wait">
        <strong>{inr(m.upcomingTotal())} is claimed and none of it is ours yet.</strong> It does not
        appear in the bank, in any ledger, or in the day close. The moment it is posted it moves
        into the bank book against the orders Sales picked, and drops off this list.
      </Note>
    </>
  );
}
