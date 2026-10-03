import { Fragment, useState } from 'react';
import { ReauthPrompt } from '../../../components/ReauthPrompt';
import { repostBankEntry } from '../../../api/payment';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { inr, toPaise } from '../format';
import { A, Kv, Lede, Note } from '../ui';
import type { AccountsBankLine } from '../types';

/** Reverse-and-repost (BR-015): the wrong line is reversed, the right one written, both kept. */
function RepostPanel({ line, onDone }: { line: AccountsBankLine; onDone: () => void }) {
  const { m, run } = useAccounts();
  const [partyId, setPartyId] = useState(line.party);
  const [amount, setAmount] = useState(String(line.amountPaise / 100));
  const [reason, setReason] = useState('');
  const [reauth, setReauth] = useState(false);
  const target = m.party(partyId);
  const ready = !!target && toPaise(amount) > 0 && reason.trim().length > 0;

  return (
    <div style={{ padding: '4px 0' }}>
      <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
        {line.id} · {inr(line.amountPaise)} — a wrong line is reversed and a right one written on
        top. Both stay in the book forever.
      </div>
      <dl className="dl" style={{ maxWidth: 560 }}>
        <Kv k="Belongs to">
          <select
            className="win"
            value={partyId}
            onChange={(e) => setPartyId(e.target.value)}
            style={{ width: 280 }}
          >
            {m.d.parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.type})
              </option>
            ))}
          </select>
        </Kv>
        <Kv k="Amount (₹)">
          <input
            className="win"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: 140 }}
          />
        </Kv>
        <Kv k="Why">
          <input
            className="win"
            placeholder="a reason is required"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: 320 }}
          />
        </Kv>
      </dl>
      <div className="btnrow" style={{ marginTop: 10 }}>
        {!reauth ? (
          <button
            type="button"
            className="btn btn-s btn-p"
            disabled={!ready || line.purpose === 'reversal'}
            onClick={() => setReauth(true)}
          >
            Repost
          </button>
        ) : (
          <ReauthPrompt
            onReauthed={(reauthToken) => {
              if (!target) return;
              void run(
                (token) =>
                  repostBankEntry(token, reauthToken, line.key, {
                    reason: reason.trim(),
                    corrected: {
                      kind: line.kind,
                      purpose: line.purpose === 'reversal' ? 'receipt' : line.purpose,
                      partyId: target.id,
                      partyType: target.type,
                      amountPaise: toPaise(amount),
                    },
                  }),
                `${line.id} reposted — the wrong line is reversed, not deleted`,
              ).then((ok) => {
                if (ok) onDone();
              });
            }}
          />
        )}
        <button type="button" className="btn btn-s" onClick={onDone}>
          Cancel
        </button>
      </div>
      {line.purpose === 'reversal' && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          A reversal line cannot itself be reposted.
        </div>
      )}
    </div>
  );
}

export function BankView() {
  const { m, can, statement } = useAccounts();
  const [repost, setRepost] = useState<string | null>(null);
  const rows = m.bankRows();
  const canRepost = can(PERMISSIONS.BANK_REPOST);
  const haveStatement = statement.trim() !== '' && !Number.isNaN(toPaise(statement));
  const diff = haveStatement ? toPaise(statement) - m.bankClosing() : null;

  return (
    <>
      <h1 className="page">Bank book</h1>
      <Lede>Every rupee in and out, in date order.</Lede>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Line</th>
              <th>Date</th>
              <th>Party</th>
              <th>Against</th>
              <th>Narration</th>
              <th className="num">In</th>
              <th className="num">Out</th>
              <th className="num">Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} className="strong">
                Opening
              </td>
              <td className="num strong">{inr(0)}</td>
              <td></td>
            </tr>
            {rows.map((r) => (
              <Fragment key={r.key}>
                <tr className={r.queried ? 'flagrow' : ''}>
                  <td className="mono strong nowrap">
                    {r.id}
                    <div className="muted mono" style={{ fontWeight: 400 }}>
                      {r.purpose}
                    </div>
                  </td>
                  <td className="mono muted nowrap">{r.date}</td>
                  <td>
                    <A to={`party/${r.party}`} strong>
                      {m.partyName(r.party)}
                    </A>
                    <div className="muted" style={{ fontSize: 11 }}>
                      {r.from}
                    </div>
                  </td>
                  <td className="mono muted nowrap">
                    {r.ref ? (
                      r.ref.startsWith('SO') ? (
                        <A to={`so/${r.ref}`}>{r.ref}</A>
                      ) : r.ref.startsWith('PO') ? (
                        <A to={`po/${r.ref}`}>{r.ref}</A>
                      ) : (
                        r.ref
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {r.narration}
                    {r.queried ? (
                      <div style={{ color: 'var(--urgent)', fontWeight: 600, marginTop: 3 }}>
                        Flagged for review — the party or the amount may be wrong.
                      </div>
                    ) : null}
                  </td>
                  <td className="num strong">{r.kind === 'in' ? inr(r.amountPaise) : ''}</td>
                  <td className="num strong">{r.kind === 'out' ? inr(r.amountPaise) : ''}</td>
                  <td className="num">{inr(r.balance)}</td>
                  <td>
                    {r.queried ? (
                      canRepost ? (
                        <button
                          type="button"
                          className="btn btn-s btn-p"
                          onClick={() => setRepost(repost === r.key ? null : r.key)}
                        >
                          Repost
                        </button>
                      ) : (
                        <span className="muted" style={{ fontSize: 11.5 }}>
                          Controller only
                        </span>
                      )
                    ) : null}
                  </td>
                </tr>
                {repost === r.key && (
                  <tr className="sub">
                    <td colSpan={9}>
                      <RepostPanel line={r} onDone={() => setRepost(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            <tr>
              <td colSpan={7} className="strong">
                Closing per the book
              </td>
              <td className="num strong">{inr(m.bankClosing())}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={7} className="muted">
                Bank statement says
              </td>
              <td className="num strong">{haveStatement ? inr(toPaise(statement)) : '—'}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={7} className="strong">
                Difference
              </td>
              <td className="num strong" style={{ color: diff ? 'var(--urgent)' : 'inherit' }}>
                {diff === null ? '—' : diff === 0 ? 'nil' : inr(diff)}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
      <Note tone={canRepost ? undefined : 'wait'}>
        <strong>A wrong party is repaired, not erased.</strong> Reposting reverses the wrong line
        and writes a new one; both stay in the book forever. Only the Controller can do it —
        otherwise the person who made the mistake is the person who hides it.
        {canRepost ? '' : ' Your seat cannot repost, so the buttons are off.'} The book opens at nil
        until an opening balance is entered; type the statement&apos;s closing figure on Day close
        to see the difference here.
      </Note>
      {m.d.reposts.length > 0 && (
        <>
          <h2 className="sec">Corrections already made</h2>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>By</th>
                  <th>Line</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                {m.d.reposts.map((r, i) => (
                  <tr key={i}>
                    <td className="mono muted nowrap">{r.at}</td>
                    <td>{r.by}</td>
                    <td className="mono">{r.line}</td>
                    <td className="muted">{m.partyName(r.from)}</td>
                    <td className="strong">{m.partyName(r.to)}</td>
                    <td className="muted">{r.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
