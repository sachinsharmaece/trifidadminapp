import type { HoldingKind, ReleaseReason } from '../../api/holding';

/** The words for each reason a holder gives (the call outcomes, less "placed an order"). */
export const REASON_LABEL: Record<ReleaseReason, string> = {
  asked_for_a_rate: 'Asked for a rate',
  wants_something_we_dont_stock: 'Wants something we don’t have',
  rate_too_high: 'Rate too high',
  already_holds_stock: 'Already holds stock',
  buys_direct_from_company: 'Buys direct from the company',
  not_now_call_later: 'Not now, call later',
  no_answer: 'No answer',
  wrong_number: 'Wrong number',
};

export const REASONS = Object.keys(REASON_LABEL) as ReleaseReason[];

export const KIND_LABEL: Record<HoldingKind, string> = {
  lead: 'Lead',
  claim: 'Claimed',
  book: 'Book',
};

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const DAY = 24 * HOUR;

const TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const DAY_MONTH = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
});
const ymd = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);

/**
 * "Call by 13:00" (or "Call by 09/11 13:00" on another day), and once it has passed
 * "Overdue by 2h 10m" — never a negative number.
 */
export function callDueText(dueAt: string, now: number): { text: string; overdue: boolean } {
  const due = new Date(dueAt);
  const late = now - due.getTime();
  if (late > 0) {
    if (late < HOUR)
      return { text: `Overdue by ${Math.max(1, Math.floor(late / MINUTE))}m`, overdue: true };
    if (late < 2 * DAY) {
      const h = Math.floor(late / HOUR);
      const m = Math.floor((late % HOUR) / MINUTE);
      return { text: `Overdue by ${h}h ${m}m`, overdue: true };
    }
    return { text: `Overdue by ${Math.floor(late / DAY)} days`, overdue: true };
  }
  const sameDay = ymd(due) === ymd(new Date(now));
  const clock = TIME.format(due);
  return { text: `Call by ${sameDay ? '' : `${DAY_MONTH.format(due)} `}${clock}`, overdue: false };
}

/** "Releasing in 4 days" / "Releasing today" — never "in -1 days". */
export function releasingText(releasesAt: string, now: number): string {
  const days = Math.ceil((new Date(releasesAt).getTime() - now) / DAY);
  if (days <= 0) return 'Releasing today';
  return `Releasing in ${days} day${days === 1 ? '' : 's'}`;
}

/** How long until the reason window opens, for a Book row. */
export function clockText(clockEndsAt: string | null, backlog: boolean, now: number): string {
  if (!clockEndsAt) return '—';
  if (backlog) return 'In the backlog queue';
  const days = Math.ceil((new Date(clockEndsAt).getTime() - now) / DAY);
  if (days <= 0) return 'Window opens today';
  return `${days} day${days === 1 ? '' : 's'} left`;
}

/** "Mhow, Indore" — or, for a party with no tehsil, "Nashik, Maharashtra". */
export function placeText(card: {
  tehsil: string | null;
  district: string | null;
  state: string | null;
}): string {
  const parts = card.tehsil ? [card.tehsil, card.district] : [card.district, card.state];
  return parts.filter(Boolean).join(', ') || '—';
}
