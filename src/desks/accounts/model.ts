import type {
  AccountsBankLine,
  AccountsMargBill,
  AccountsMovement,
  AccountsParty,
  AccountsPo,
  AccountsSnapshot,
  AccountsSo,
  AccountsSoState,
  AccountsUpcoming,
} from './types';

/**
 * Everything the desk derives from the snapshot, in one place — the same
 * derivations the prototype (`accounts_v5.html`) makes from its own data, so
 * a figure on one screen can never disagree with the same figure on another.
 * Pure: no state, no fetching.
 */

export type StageKey = 'so' | 'payment' | 'po' | 'leg1' | 'marg' | 'dispatch';

export const STAGES: Array<{ k: StageKey; label: string; short: string; who: string }> = [
  { k: 'so', label: 'Sales order', short: 'SO', who: 'Sales' },
  { k: 'payment', label: 'Payment', short: 'Payment', who: 'Buyer → Accounts' },
  { k: 'po', label: 'Purchase order', short: 'PO', who: 'Purchase' },
  { k: 'leg1', label: 'Leg 1 complete', short: 'Leg 1', who: 'Logistics' },
  { k: 'marg', label: 'Billed in Marg', short: 'Marg', who: 'Accounts' },
  { k: 'dispatch', label: 'Dispatch', short: 'Dispatch', who: 'Logistics' },
];

export type Tone = 'wait' | 'urgent' | 'ok' | 'info' | 'flat';

export const SOSTATE: Record<AccountsSoState, [string, Tone]> = {
  awaiting_payment: ['Awaiting payment', 'urgent'],
  awaiting_goods: ['Waiting on goods', 'wait'],
  ready_to_bill: ['Ready to bill in Marg', 'urgent'],
  billing_query: ['Marg under query', 'urgent'],
  awaiting_dispatch: ['Billed — awaiting dispatch', 'wait'],
  supply_failed: ['Supply failed — refund', 'urgent'],
  promotion_offered: ['Replacement offered', 'wait'],
  disputed: ['Disputed', 'urgent'],
  closed: ['Closed', 'ok'],
};

export const MSTATE: Record<AccountsMovement['state'], [string, Tone]> = {
  in_transit: ['On the road', 'info'],
  at_indore: ['At Indore', 'ok'],
  delivered: ['Delivered', 'ok'],
  held: ['Held', 'wait'],
};

export const URS: Record<AccountsUpcoming['state'], [string, Tone]> = {
  waiting: ['Said, not landed', 'wait'],
  landed_wrong_account: ['Landed from the wrong account', 'urgent'],
};

export interface Chain {
  id: string;
  so: AccountsSo | undefined;
  po: AccountsPo | undefined;
  marg: AccountsMargBill | undefined;
  payments: AccountsBankLine[];
  upcoming: AccountsUpcoming[];
  dispatch: AccountsMovement | undefined;
  paid: number;
  owed: number;
  short: number;
  leg1: boolean;
  billed: boolean;
  failed: boolean;
  gone: boolean;
  stage: StageKey | 'done';
}

export interface LedgerRow {
  date: string;
  doc: string;
  link: string;
  what: string;
  dr: number;
  cr: number;
  balance: number;
}

export interface BankRow extends AccountsBankLine {
  balance: number;
}

export type Gate = { g: string; ok: boolean };

export function createModel(d: AccountsSnapshot) {
  const party = (id: string): AccountsParty | undefined => d.parties.find((p) => p.id === id);
  const partyName = (id: string): string => party(id)?.name ?? 'Unknown';
  const buyers = () => d.parties.filter((p) => p.type === 'buyer');
  const sellers = () => d.parties.filter((p) => p.type === 'seller');
  const so = (id: string) => d.sos.find((x) => x.id === id);
  const po = (id: string) => d.pos.find((x) => x.id === id);
  const billFor = (poId: string) => d.bills.find((b) => b.po === poId);

  /** The bill that counts for an SO: the one that agreed, else the latest one under query. */
  const margFor = (soId: string): AccountsMargBill | undefined => {
    const all = d.margBills.filter((m) => m.so === soId);
    return all.find((m) => m.state === 'matched') ?? all[all.length - 1];
  };

  const chainOf = (chainNo: string): Chain => {
    const s = d.sos.find((x) => x.chain === chainNo);
    const p = d.pos.find((x) => x.chain === chainNo);
    const m = s ? margFor(s.id) : undefined;
    const payments = s
      ? d.bankbook.filter((b) => b.kind === 'in' && b.purpose === 'receipt' && b.ref === s.id)
      : [];
    const up = s ? d.upcoming.filter((u) => u.sos.includes(s.id)) : [];
    const dispatch = d.movements.find((x) => x.leg === 2 && x.chain === chainNo);
    const paid = payments.reduce((n, b) => n + b.amountPaise, 0);
    const owed = s ? s.totalPaise : 0;
    const leg1 = !!(p && p.received && p.inspected && p.billed);
    const billed = !!(m && m.state === 'matched');
    const failed = !!(p && p.failed) || s?.state === 'supply_failed';
    const gone =
      s?.state === 'closed' ||
      !!(dispatch && (dispatch.state === 'delivered' || dispatch.state === 'in_transit'));
    const stage: Chain['stage'] = failed
      ? 'po'
      : !s
        ? 'so'
        : paid < owed
          ? 'payment'
          : !p
            ? 'po'
            : !leg1
              ? 'leg1'
              : !billed
                ? 'marg'
                : !gone
                  ? 'dispatch'
                  : 'done';
    return {
      id: chainNo,
      so: s,
      po: p,
      marg: m,
      payments,
      upcoming: up,
      dispatch,
      paid,
      owed,
      short: Math.max(0, owed - paid),
      leg1,
      billed,
      failed,
      gone,
      stage,
    };
  };
  const allChains = (): Chain[] => d.sos.map((s) => chainOf(s.chain));

  const chainDone = (ch: Chain, k: StageKey): boolean => {
    switch (k) {
      case 'so':
        return !!ch.so;
      case 'payment':
        return ch.owed > 0 && ch.paid >= ch.owed;
      case 'po':
        return !!ch.po && !ch.failed;
      case 'leg1':
        return ch.leg1;
      case 'marg':
        return ch.billed;
      case 'dispatch':
        return ch.gone;
    }
  };

  /** Where clicking a stage should go (a path under /accounts), or null. */
  const stagePath = (ch: Chain, k: StageKey): string | null => {
    switch (k) {
      case 'so':
        return ch.so ? `so/${ch.so.id}` : null;
      case 'payment':
        return ch.payments.length ? 'bank' : ch.upcoming.length ? 'upcoming' : null;
      case 'po':
      case 'leg1':
        return ch.po ? `po/${ch.po.id}` : null;
      case 'marg':
        return 'billing';
      case 'dispatch':
        return 'movements';
    }
  };

  const stageNote = (ch: Chain, k: StageKey, fmt: (paise: number) => string): string => {
    switch (k) {
      case 'so':
        return ch.so?.id ?? '';
      case 'payment':
        return ch.paid ? fmt(ch.paid) : ch.upcoming.length ? 'claimed, not landed' : 'nothing yet';
      case 'po':
        return ch.failed ? 'seller failed' : ch.po ? ch.po.id : 'waits for the money';
      case 'leg1':
        return ch.leg1 ? 'goods in, inspected, billed' : ch.po ? 'not complete' : 'not yet';
      case 'marg':
        return ch.marg
          ? ch.marg.state === 'matched'
            ? ch.marg.id
            : `${ch.marg.id} — under query`
          : 'not billed';
      case 'dispatch':
        return ch.dispatch
          ? ch.dispatch.state === 'held'
            ? 'held'
            : ch.dispatch.lr !== '—'
              ? ch.dispatch.lr
              : ch.dispatch.state
          : 'not yet';
    }
  };

  // --- the bank book ----------------------------------------------------
  const bankRows = (): BankRow[] => {
    let bal = 0;
    return d.bankbook.map((r) => {
      bal += r.kind === 'in' ? r.amountPaise : -r.amountPaise;
      return { ...r, balance: bal };
    });
  };
  const bankClosing = (): number => d.bankClosingPaise;
  const upcomingTotal = (): number => d.upcoming.reduce((n, u) => n + u.amountPaise, 0);

  // --- ledgers — computed, never typed (BR-014) -------------------------
  const ledger = (id: string): LedgerRow[] => {
    const p = party(id);
    if (!p) return [];
    const rows: Omit<LedgerRow, 'balance'>[] = [];
    if (p.type === 'buyer') {
      d.margBills
        .filter((m) => m.party === id && m.state === 'matched')
        .forEach((m) =>
          rows.push({
            date: m.date,
            doc: m.id,
            link: 'billing',
            what: `Billed in Marg · ${m.so}`,
            dr: m.valuePaise,
            cr: 0,
          }),
        );
      d.bankbook
        .filter((b) => b.partyType === 'buyer' && b.party === id)
        .forEach((b) => {
          if (b.kind === 'in' && b.purpose === 'receipt') {
            rows.push({
              date: b.date,
              doc: b.id,
              link: 'bank',
              dr: 0,
              cr: b.amountPaise,
              what: b.ref ? `Received against ${b.ref}` : 'Received — nothing behind it',
            });
          } else if (b.kind === 'out' && (b.purpose === 'refund' || b.purpose === 'reversal')) {
            rows.push({
              date: b.date,
              doc: b.id,
              link: 'bank',
              dr: b.amountPaise,
              cr: 0,
              what: b.purpose === 'refund' ? 'Refunded' : 'Reversed',
            });
          }
        });
    } else {
      d.bills
        .filter((b) => b.party === id)
        .forEach((b) =>
          rows.push({
            date: b.date,
            doc: b.id,
            link: `po/${b.po}`,
            what: `Seller's bill · ${b.po}`,
            dr: 0,
            cr: b.totalPaise,
          }),
        );
      d.bankbook
        .filter((b) => b.partyType === 'seller' && b.party === id)
        .forEach((b) => {
          if (b.kind === 'out' && b.purpose === 'payout') {
            rows.push({
              date: b.date,
              doc: b.id,
              link: 'bank',
              what: `Paid · ${b.ref ?? ''}`,
              dr: b.amountPaise,
              cr: 0,
            });
          } else if (b.kind === 'in' && b.purpose === 'reversal') {
            rows.push({
              date: b.date,
              doc: b.id,
              link: 'bank',
              what: 'Payment reversed',
              dr: 0,
              cr: b.amountPaise,
            });
          }
        });
    }
    rows.sort((a, b) => a.date.localeCompare(b.date));
    let bal = p.openingPaise;
    return rows.map((r) => {
      bal += p.type === 'buyer' ? r.dr - r.cr : r.cr - r.dr;
      return { ...r, balance: bal };
    });
  };
  const balanceOf = (id: string): number => {
    const l = ledger(id);
    return l.length ? (l[l.length - 1]?.balance ?? 0) : (party(id)?.openingPaise ?? 0);
  };
  const totalAdvances = (): number =>
    buyers().reduce((n, b) => n + Math.max(0, -balanceOf(b.id)), 0);
  const totalDebtors = (): number => buyers().reduce((n, b) => n + Math.max(0, balanceOf(b.id)), 0);
  const totalPayable = (): number =>
    sellers().reduce((n, s) => n + Math.max(0, balanceOf(s.id)), 0);

  // --- when a seller is paid — on inspection, with his bill in hand --------
  const gatesOf = (p: AccountsPo): Gate[] => [
    { g: 'Goods at Indore', ok: p.received },
    { g: 'Inspection passed', ok: p.inspected },
    { g: "Seller's bill", ok: p.billed },
  ];
  const threeGatesOk = (p: AccountsPo): boolean => gatesOf(p).every((x) => x.ok);

  /**
   * Why a PO that has passed the three chain gates still is not payable —
   * the other two facts the server checks (INV-17): Accounts' own
   * confirmation, and a bank detail that is verified and past its cooling.
   */
  const holdOf = (p: AccountsPo): string | null => {
    if (p.hold) return p.bankOk ? 'On hold' : 'Bank details not verified';
    if (threeGatesOk(p) && !p.confirmed) return 'Accounts confirmation pending';
    if (threeGatesOk(p) && !p.bankOk) return 'Bank details not verified';
    return null;
  };

  const batchedKeys = (): Set<string> =>
    new Set(
      d.runs
        .filter((r) => r.state === 'awaiting_release')
        .flatMap((r) => r.items.map((i) => i.key)),
    );
  const inBatch = (key: string): boolean => batchedKeys().has(key);
  const isPayable = (p: AccountsPo): boolean =>
    !p.failed && !p.paid && !p.hold && threeGatesOk(p) && p.confirmed && p.bankOk;
  const poValue = (p: AccountsPo): number => p.payablePaise;
  const runTotal = (r: AccountsSnapshot['runs'][number]): number =>
    r.items.reduce((n, i) => n + i.amountPaise, 0);

  return {
    d,
    party,
    partyName,
    buyers,
    sellers,
    so,
    po,
    billFor,
    margFor,
    chainOf,
    allChains,
    chainDone,
    stagePath,
    stageNote,
    bankRows,
    bankClosing,
    upcomingTotal,
    ledger,
    balanceOf,
    totalAdvances,
    totalDebtors,
    totalPayable,
    gatesOf,
    holdOf,
    inBatch,
    isPayable,
    poValue,
    runTotal,
  };
}

export type Model = ReturnType<typeof createModel>;
