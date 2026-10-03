import { Link } from 'react-router-dom';
import { useAccounts } from '../AccountsContext';
import { inr } from '../format';
import { STAGES } from '../model';
import { Lede, Note, Pill } from '../ui';

export function ProcessView() {
  const { m } = useAccounts();
  const chains = m.allChains().filter((c) => c.so);
  const stopped = chains.filter((c) => c.stage === 'marg');

  return (
    <>
      <h1 className="page">The process</h1>
      <Lede>Every deal, and how far it has got.</Lede>
      <Note>
        <strong>{STAGES.map((s, i) => `${i + 1}. ${s.label}`).join(' → ')}.</strong> The purchase
        order is issued <em>after</em> the buyer&apos;s money is confirmed, never before — so we
        never commit our own cash to a seller. Marg bills after that, and nothing is dispatched
        until the invoice and the e-way bill exist.
      </Note>

      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>SO</th>
              <th>Buyer</th>
              <th>Goods</th>
              {STAGES.map((s) => (
                <th key={s.k} style={{ textAlign: 'center' }}>
                  {s.short}
                </th>
              ))}
              <th className="num">Value</th>
              <th>Waiting at</th>
            </tr>
          </thead>
          <tbody>
            {chains.map((c) => {
              const so = c.so!;
              const buyer = m.party(so.party);
              return (
                <tr key={so.id}>
                  <td className="mono strong nowrap">
                    <Link to={`/accounts/so/${so.id}`} style={{ color: 'inherit' }}>
                      {so.id}
                    </Link>
                  </td>
                  <td className="nowrap">
                    <Link
                      to={`/accounts/party/${so.party}`}
                      style={{ color: 'inherit', fontWeight: 600 }}
                    >
                      {buyer?.name ?? '—'}
                    </Link>
                  </td>
                  <td className="muted nowrap">
                    {so.lines[0] ? `${so.lines[0].qty} × ${so.lines[0].item}` : ''}
                  </td>
                  {STAGES.map((s) => {
                    const done = m.chainDone(c, s.k);
                    const at = c.stage === s.k;
                    const path = m.stagePath(c, s.k);
                    const bad = at && c.failed;
                    const cls = `dot ${done ? 'on' : at ? (bad ? 'bad' : 'now') : ''}`;
                    const glyph = done ? '✓' : at ? (bad ? '✕' : '●') : '·';
                    return (
                      <td key={s.k} style={{ textAlign: 'center' }}>
                        {path ? (
                          <Link to={`/accounts/${path}`} className={cls} title={s.label}>
                            {glyph}
                          </Link>
                        ) : (
                          <span className={cls}>{glyph}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="num strong">{inr(c.owed)}</td>
                  <td className="nowrap">
                    {c.stage === 'done' ? (
                      <Pill tone="ok">closed</Pill>
                    ) : (
                      <Pill tone={c.failed ? 'urgent' : 'wait'}>
                        {STAGES.find((s) => s.k === c.stage)?.short ?? c.stage}
                      </Pill>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {stopped.length > 0 && (
        <Note tone="urgent">
          <strong>
            {stopped.length === 1
              ? 'One order is stopped on this desk, not on anybody else’s.'
              : `${stopped.length} orders are stopped on this desk, not on anybody else’s.`}
          </strong>{' '}
          {stopped
            .map((c) =>
              c.marg
                ? `${c.so!.id} was billed, but Marg says ${inr(c.marg.valuePaise)} against an SO of ${inr(c.owed)} — ${inr(Math.abs(c.owed - c.marg.valuePaise))} out, holding ${inr(c.owed)} of revenue out of the register and a lorry in the yard.`
                : `${c.so!.id} is paid, the goods are in and inspected, and it has not been billed in Marg — so it cannot move.`,
            )
            .join(' ')}
        </Note>
      )}
    </>
  );
}
