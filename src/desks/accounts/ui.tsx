import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAccounts } from './AccountsContext';
import { inr } from './format';
import { STAGES } from './model';
import type { Tone } from './model';
import type { AccountsLogEntry, AccountsPo, AccountsSo } from './types';

/**
 * The template's small pieces, as components. Class names are the template's
 * own (accounts.css), so a screen built from these looks exactly like the
 * prototype.
 */

export const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span className={`pill pill-${tone}`}>{children}</span>
);

export const Kv = ({ k, children }: { k: string; children: ReactNode }) => (
  <div>
    <dt>{k}</dt>
    <dd>{children}</dd>
  </div>
);

export function Note({
  tone,
  style,
  children,
}: {
  tone?: 'wait' | 'urgent' | 'ok';
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={`note${tone ? ` note-${tone}` : ''}`} style={style}>
      {children}
    </div>
  );
}

export const Lede = ({ children }: { children: ReactNode }) => <p className="lede">{children}</p>;

export const Sec = ({ children }: { children: ReactNode }) => <h2 className="sec">{children}</h2>;

export const Back = ({ to, label }: { to: string; label: string }) => {
  const { go } = useAccounts();
  return (
    <div className="btnrow" style={{ marginBottom: 10 }}>
      <button type="button" className="btn btn-s" onClick={() => go(to)}>
        ← {label}
      </button>
    </div>
  );
};

export const Empty = ({ title, children }: { title: string; children?: ReactNode }) => (
  <div className="empty">
    <h3>{title}</h3>
    {children ? <p>{children}</p> : null}
  </div>
);

/** A link styled as the template's inherit-colour anchors. */
export const A = ({
  to,
  mono,
  strong,
  children,
}: {
  to: string;
  mono?: boolean;
  strong?: boolean;
  children: ReactNode;
}) => (
  <Link
    to={`/accounts/${to}`}
    className={mono ? 'mono' : undefined}
    style={{ color: 'inherit', fontWeight: strong ? 600 : undefined }}
  >
    {children}
  </Link>
);

/** A row you can click — the template's `.row[role=button]`, with a keyboard path as well. */
export function TapRow({
  to,
  style,
  children,
}: {
  to: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { go } = useAccounts();
  return (
    <div
      className="row"
      role="button"
      tabIndex={0}
      style={style}
      onClick={() => go(to)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') go(to);
      }}
    >
      {children}
    </div>
  );
}

/** A table row you can click — the template's `tr.tap`. */
export function TapTr({ to, children }: { to: string; children: ReactNode }) {
  const { go } = useAccounts();
  return (
    <tr
      className="tap"
      tabIndex={0}
      onClick={() => go(to)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') go(to);
      }}
    >
      {children}
    </tr>
  );
}

/** The six-stage chain on every document. */
export function ChainStrip({ chainNo, here }: { chainNo: string; here: string }) {
  const { m, go } = useAccounts();
  if (!chainNo) {
    return (
      <Note>
        <strong>No chain behind this one.</strong> There is no sales order and no buyer at the other
        end.
      </Note>
    );
  }
  const ch = m.chainOf(chainNo);
  return (
    <div className="chain">
      {STAGES.map((s, i) => {
        const done = m.chainDone(ch, s.k);
        const at = ch.stage === s.k;
        const path = m.stagePath(ch, s.k);
        const bad = at && (ch.failed || (s.k === 'marg' && ch.marg?.state === 'query'));
        const cls = `cstep ${done ? 'done' : ''} ${at ? 'at' : ''} ${bad ? 'bad' : ''} ${
          here === s.k ? 'here' : ''
        }`;
        return (
          <div
            key={s.k}
            className={cls}
            {...(path
              ? {
                  role: 'button',
                  tabIndex: 0,
                  onClick: () => go(path),
                  onKeyDown: (e: React.KeyboardEvent) => {
                    if (e.key === 'Enter') go(path);
                  },
                }
              : {})}
          >
            <span className="cn">{done ? '✓' : i + 1}</span>
            <div>
              <b>{s.label}</b>
              <small>{m.stageNote(ch, s.k, inr) || 'not yet'}</small>
              <em>{s.who}</em>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const LogTable = ({ rows }: { rows: AccountsLogEntry[] }) => (
  <div className="card pad0">
    {rows
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((e, i) => (
        <div key={i} className="row" style={{ gridTemplateColumns: '150px 1fr 190px' }}>
          <span className="mono muted" style={{ fontSize: 12 }}>
            {e.at}
          </span>
          <div className="rmain">
            {e.what}
            {e.why ? <small>{e.why}</small> : null}
          </div>
          <span className="muted" style={{ fontSize: 12 }}>
            {e.by}
          </span>
        </div>
      ))}
  </div>
);

/** An SO's rate includes GST (DEC-045); a PO's rate is taxable with GST on top. */
export function DocLines({ doc, kind }: { doc: AccountsSo | AccountsPo; kind: 'so' | 'po' }) {
  const { m } = useAccounts();
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th className="num">Qty</th>
            <th className="num">{kind === 'so' ? 'Rate (incl. GST)' : 'Rate'}</th>
            <th className="num">{kind === 'so' ? 'Value (incl. GST)' : 'Value'}</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i}>
              <td className="strong">{l.item}</td>
              <td className="num">{l.qty}</td>
              <td className="num">{inr(l.ratePaise)}</td>
              <td className="num strong">{inr(l.qty * l.ratePaise)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="strong">
              Taxable
            </td>
            <td className="num strong">{inr(doc.taxablePaise)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="muted">
              GST at {m.d.config.gstPct}%
            </td>
            <td className="num">{inr(doc.gstPaise)}</td>
          </tr>
          <tr>
            <td colSpan={3} className="strong">
              Total
            </td>
            <td className="num strong">{inr(doc.totalPaise)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export const Gate = ({ ok, title }: { ok: boolean; title?: string }) => (
  <span className={`gate ${ok ? 'on' : ''}`} title={title}>
    {ok ? '✓' : '·'}
  </span>
);

export const Kpi = ({
  value,
  label,
  small,
  hot,
  onClick,
}: {
  value: ReactNode;
  label: string;
  small: string;
  hot?: boolean;
  onClick?: () => void;
}) => (
  // A div, as in the template: a button would centre its content when the grid row stretches.
  <div
    className={`kpi ${hot ? 'hot' : ''}`}
    {...(onClick
      ? {
          role: 'button',
          tabIndex: 0,
          onClick,
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') onClick();
          },
        }
      : {})}
  >
    <b>{value}</b>
    <span>{label}</span>
    <small>{small}</small>
  </div>
);
