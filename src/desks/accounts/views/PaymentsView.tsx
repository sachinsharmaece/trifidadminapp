import { useState } from 'react';
import { buildPaymentRun, releasePaymentRun, sendBackPaymentRun } from '../../../api/payment';
import { ReauthPrompt } from '../../../components/ReauthPrompt';
import { PERMISSIONS } from '../../../lib/permissions';
import { useAccounts } from '../AccountsContext';
import { bxs, inr } from '../format';
import { A, Gate, Lede, Note, Pill } from '../ui';

export function PaymentsView() {
  const { m, can, run, employeeId, batch, toggleBatch, clearBatch, say } = useAccounts();
  const d = m.d;
  const [releasing, setReleasing] = useState<string | null>(null);
  const [sendingBack, setSendingBack] = useState<string | null>(null);
  const [sendBackWhy, setSendBackWhy] = useState('');

  const rows = d.pos
    .filter((p) => !p.paid && !p.failed)
    .sort((a, b) => Number(m.isPayable(b)) - Number(m.isPayable(a)) || a.due.localeCompare(b.due));
  const ready = rows.filter((p) => m.isPayable(p) && !m.inBatch(p.key));
  const refunds = d.refunds.filter((r) => r.state !== 'not_payable');
  const canBuild = can(PERMISSIONS.PAYOUT_BUILD);
  const canRelease = can(PERMISSIONS.PAYOUT_RELEASE);

  const picked = batch.map((t) => {
    const [kind, key] = t.split(':') as ['payout' | 'refund', string];
    return { kind, key, token: t };
  });
  const pickedTotal = picked.reduce((n, x) => {
    if (x.kind === 'payout') {
      const p = d.pos.find((q) => q.key === x.key);
      return n + (p ? m.poValue(p) : 0);
    }
    return n + (d.refunds.find((r) => r.key === x.key)?.amountPaise ?? 0);
  }, 0);

  return (
    <>
      <h1 className="page">Payments &amp; refunds</h1>
      <Lede>Everything going out — sellers and buyers on one screen.</Lede>
      <Note>
        <strong>A seller is paid on inspection.</strong> Goods at Indore, inspected, his bill in
        hand. We do not wait for our own dispatch. Asking to be paid early does not make it payable.
      </Note>

      <h2 className="sec">To sellers</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>PO</th>
              <th>Seller</th>
              <th className="num">Amount</th>
              <th>Gates</th>
              <th>Due</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const ok = m.isPayable(p) && !m.inBatch(p.key);
              const token = `payout:${p.key}`;
              const s = m.party(p.party);
              const hold = m.holdOf(p);
              return (
                <tr key={p.key}>
                  <td>
                    {ok && canBuild ? (
                      <input
                        type="checkbox"
                        checked={batch.includes(token)}
                        onChange={() => toggleBatch(token)}
                        aria-label={`Pick ${p.id}`}
                      />
                    ) : null}
                  </td>
                  <td className="mono strong nowrap">
                    <A to={`po/${p.id}`}>{p.id}</A>
                    <div className="muted" style={{ fontWeight: 400, fontSize: 11 }}>
                      {p.lines[0] ? `${bxs(p.lines[0].qty)} ${p.lines[0].item}` : ''}
                    </div>
                  </td>
                  <td>
                    {s?.name}
                    <div className="muted" style={{ fontSize: 11 }}>
                      {s?.bank}
                      {s?.verified ? (
                        ''
                      ) : (
                        <>
                          {' · '}
                          <span style={{ color: 'var(--urgent)' }}>unverified</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="num strong">{inr(m.poValue(p))}</td>
                  <td className="gates">
                    {m.gatesOf(p).map((g) => (
                      <Gate key={g.g} ok={g.ok} />
                    ))}
                  </td>
                  <td className="mono nowrap muted">{p.due}</td>
                  <td>
                    {m.inBatch(p.key) ? (
                      <Pill tone="info">in a batch</Pill>
                    ) : m.isPayable(p) ? (
                      <Pill tone="ok">payable</Pill>
                    ) : hold ? (
                      <Pill tone={hold === 'Accounts confirmation pending' ? 'wait' : 'urgent'}>
                        {hold}
                      </Pill>
                    ) : (
                      <Pill tone="wait">gate open</Pill>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  Nothing owed to a seller right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="btnrow" style={{ marginTop: 12 }}>
        <span className="muted" style={{ alignSelf: 'center', fontSize: 13 }}>
          {picked.length ? `${picked.length} picked · ${inr(pickedTotal)}` : 'Nothing picked'} ·{' '}
          {ready.length} payable
        </span>
        <button
          type="button"
          className="btn btn-s btn-p"
          disabled={!picked.length || !canBuild}
          onClick={() => {
            void run(
              (token) =>
                buildPaymentRun(
                  token,
                  picked.map((x) => ({ kind: x.kind, refId: x.key })),
                ),
              `Batch built with ${picked.length} payment${picked.length === 1 ? '' : 's'} — it now needs a second person`,
            ).then((ok) => {
              if (ok) clearBatch();
            });
          }}
        >
          Build a batch
        </button>
        {!canBuild && (
          <span className="lockmsg" style={{ alignSelf: 'center' }}>
            Your seat does not build batches.
          </span>
        )}
      </div>

      <h2 className="sec">To buyers</h2>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Refund</th>
              <th>Buyer</th>
              <th>Why</th>
              <th className="num">Amount</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => {
              const token = `refund:${r.key}`;
              return (
                <tr key={r.key}>
                  <td>
                    {r.state === 'ready' && canBuild ? (
                      <input
                        type="checkbox"
                        checked={batch.includes(token)}
                        onChange={() => toggleBatch(token)}
                        aria-label={`Pick ${r.id}`}
                      />
                    ) : null}
                  </td>
                  <td className="mono strong nowrap">
                    {r.id}
                    <div className="muted mono" style={{ fontWeight: 400 }}>
                      {r.so}
                    </div>
                  </td>
                  <td>
                    <A to={`party/${r.party}`}>{m.partyName(r.party)}</A>
                  </td>
                  <td className="muted">{r.why}</td>
                  <td className="num strong">{inr(r.amountPaise)}</td>
                  <td>
                    {r.state === 'ready' ? (
                      <Pill tone="ok">ready</Pill>
                    ) : r.state === 'in_batch' ? (
                      <Pill tone="info">in a batch</Pill>
                    ) : (
                      <Pill tone="urgent">held</Pill>
                    )}
                  </td>
                </tr>
              );
            })}
            {refunds.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  Nothing to refund.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Note tone="wait">
        <strong>A refund here means we took his money and could not deliver.</strong> It goes back
        in full, to the account it came from, and the failure is recorded against the seller who
        caused it. A refund is picked into a batch like any payout — the same two people, the same
        release.
      </Note>

      <h2 className="sec">Batches</h2>
      <Note tone="urgent">
        <strong>Maker–checker.</strong> Whoever builds a batch cannot release it.
      </Note>
      {d.runs.map((r) => {
        const total = m.runTotal(r);
        const mine = r.builtByKey === employeeId;
        const mayRelease = canRelease && !mine;
        const why = !canRelease
          ? 'Only the Controller releases a batch.'
          : mine
            ? 'You built this batch. Somebody else has to release it.'
            : '';
        return (
          <div key={r.key} className="card">
            <div className="cardhead">
              <div>
                <h3>
                  <span className="mono">{r.id}</span>
                </h3>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  built by {r.builtBy} · {r.builtAt}
                  {r.releasedBy ? ` · released by ${r.releasedBy} ${r.releasedAt}` : ''}
                </div>
              </div>
              <div>
                {r.state === 'released' ? (
                  <Pill tone="ok">released</Pill>
                ) : r.state === 'sent_back' ? (
                  <Pill tone="flat">sent back</Pill>
                ) : (
                  <Pill tone="urgent">waiting for a second person</Pill>
                )}
              </div>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Party</th>
                    <th>Account</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {r.items.map((i) => (
                    <tr key={`${i.kind}:${i.key}`}>
                      <td className="mono">{i.ref}</td>
                      <td>{m.partyName(i.party)}</td>
                      <td className="mono muted">{m.party(i.party)?.bank}</td>
                      <td className="num strong">{inr(i.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="strong">
                      Total
                    </td>
                    <td className="num strong">{inr(total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {r.state === 'awaiting_release' && (
              <div className="btnrow" style={{ marginTop: 12 }}>
                {releasing === r.key ? (
                  <ReauthPrompt
                    onReauthed={(reauthToken) => {
                      void run(
                        (token) => releasePaymentRun(token, reauthToken, r.key),
                        `${r.id} released — ${inr(total)} out`,
                      ).then(() => setReleasing(null));
                    }}
                  />
                ) : mayRelease ? (
                  <button
                    type="button"
                    className="btn btn-s btn-p"
                    onClick={() => {
                      say('Confirm your password to release.');
                      setReleasing(r.key);
                    }}
                  >
                    Release {inr(total)}
                  </button>
                ) : (
                  <>
                    <button type="button" className="btn btn-s" disabled>
                      Release
                    </button>
                    <span className="muted" style={{ alignSelf: 'center', fontSize: 12.5 }}>
                      {why}
                    </span>
                  </>
                )}
                {canRelease && releasing !== r.key && (
                  <button
                    type="button"
                    className="btn btn-s btn-d"
                    onClick={() => {
                      setSendingBack(sendingBack === r.key ? null : r.key);
                      setSendBackWhy('');
                    }}
                  >
                    Send back
                  </button>
                )}
              </div>
            )}
            {r.state === 'awaiting_release' && sendingBack === r.key && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div className="muted" style={{ fontSize: 12.5, marginBottom: 8 }}>
                  Nothing has moved. Every payment in this batch becomes free to go into a new one,
                  and your reason stays on the batch.
                </div>
                <input
                  className="win"
                  placeholder="why it is going back (required)"
                  value={sendBackWhy}
                  onChange={(e) => setSendBackWhy(e.target.value)}
                  style={{ width: 360 }}
                />
                <div className="btnrow" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn btn-s btn-d"
                    disabled={!sendBackWhy.trim()}
                    onClick={() => {
                      void run(
                        (token) => sendBackPaymentRun(token, r.key, sendBackWhy.trim()),
                        `${r.id} sent back — nothing moved`,
                      ).then((ok) => {
                        if (ok) setSendingBack(null);
                      });
                    }}
                  >
                    Send {r.id} back
                  </button>
                  <button type="button" className="btn btn-s" onClick={() => setSendingBack(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {r.state === 'sent_back' && (
              <Note tone="wait" style={{ margin: '12px 0 0' }}>
                <strong>Sent back by {r.sentBackBy}</strong> {r.sentBackAt} — {r.sentBackReason}.
                Its payments are free to go into a new batch.
              </Note>
            )}
          </div>
        );
      })}
      {d.runs.length === 0 && <Note>No batches yet. Pick payments above and build one.</Note>}
    </>
  );
}
