import { useState } from 'react';
import { editPo } from '../../api/chain';
import { PERMISSIONS } from '../../lib/permissions';
import { useAccounts } from './AccountsContext';
import { toPaise } from './format';
import { Kv, Note } from './ui';
import type { AccountsPo, AccountsSo } from './types';

/**
 * "Edit quantity or rate" — the template's block, kept where the template has
 * it. Two honest differences from the prototype:
 *   - a purchase order is edited by whoever holds `po:edit` (Purchase); Accounts
 *     has no power to alter a rate (BR-070), so for them the block says so.
 *   - a sales order's quantity is only ever *reduced*, by Sales, against an
 *     inspection (Q6) — never edited here.
 * The old figures stay in the log either way (BR-036).
 */
export function EditBlock({
  kind,
  doc,
  what,
  locked,
}: {
  kind: 'so' | 'po';
  doc: AccountsSo | AccountsPo;
  what: string;
  locked: string | null;
}) {
  const { can, run, say } = useAccounts();
  const [open, setOpen] = useState(false);
  const line = doc.lines[0];
  const [qty, setQty] = useState(String(line?.qty ?? ''));
  const [rate, setRate] = useState(String((line?.ratePaise ?? 0) / 100));
  const [why, setWhy] = useState('');
  const [busy, setBusy] = useState(false);

  const lockedText =
    locked ??
    (kind === 'so'
      ? "A sales order's quantity is only ever reduced, by Sales, against an inspection. Nothing is edited from this desk."
      : !can(PERMISSIONS.PO_EDIT)
        ? 'Quantity and rate on a purchase order are changed on the Purchase desk. Accounts has no power to alter a rate (BR-070).'
        : null);

  if (lockedText) {
    return <Note style={{ marginTop: 12 }}>{lockedText}</Note>;
  }
  if (!open) {
    return (
      <div className="btnrow" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-s btn-p" onClick={() => setOpen(true)}>
          Edit quantity or rate
        </button>
      </div>
    );
  }

  async function apply(): Promise<void> {
    if (!line) return;
    const changes: Array<{ field: 'qty' | 'rate'; to: number }> = [];
    if (Number(qty) !== line.qty) changes.push({ field: 'qty', to: Number(qty) });
    if (toPaise(rate) !== line.ratePaise) {
      changes.push({ field: 'rate', to: Math.round(toPaise(rate) / line.baseUnitsPerBox) });
    }
    if (changes.length === 0) return say('Nothing changed.');
    setBusy(true);
    for (const change of changes) {
      const ok = await run(
        (token) => editPo(token, (doc as AccountsPo).key, { ...change, reason: why }),
        `${doc.id} edited — old figures kept`,
      );
      if (!ok) break;
    }
    setBusy(false);
    setOpen(false);
  }

  return (
    <>
      <div className="btnrow" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-s" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <dl className="dl">
          <Kv k="Quantity">
            <input
              className="win"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              style={{ width: 110 }}
            />
          </Kv>
          <Kv k="Rate per box">
            <input
              className="win"
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              style={{ width: 130 }}
            />
          </Kv>
          <Kv k="Why">
            <input
              className="win"
              placeholder="a reason is required"
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              style={{ width: 320 }}
            />
          </Kv>
        </dl>
        <Note style={{ margin: '10px 0' }}>
          <strong>Only quantity and rate.</strong> {what} The old figures stay in the log below.
        </Note>
        <div className="btnrow">
          <button
            type="button"
            className="btn btn-s btn-p"
            disabled={busy || !why.trim()}
            onClick={() => void apply()}
          >
            Apply
          </button>
        </div>
      </div>
    </>
  );
}
