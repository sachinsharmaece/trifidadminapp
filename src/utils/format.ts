/** "18 Nov 2026" from an ISO date string, in Indian time. Returns the original text if it is not a valid date. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    // The business runs on Indian time: a margin that starts "on 1 Dec" starts at midnight there.
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/** A bank account number hidden except its last 4 digits: "4321" -> "•••• •••• 4321". */
export function maskedAccount(last4: string): string {
  return `•••• •••• ${last4}`;
}

/** Basis points as a plain number of percent: 1800 -> "18", 250 -> "2.5". */
export function bpToPercentText(basisPoints: number): string {
  return String(basisPoints / 100);
}

/** Basis points as a percentage for display: 1800 -> "18%". */
export function formatPercent(basisPoints: number): string {
  return `${bpToPercentText(basisPoints)}%`;
}

/** Paise as rupees for display, with Indian digit grouping: 60000 -> "₹600.00", 123456700 -> "₹12,34,567.00". */
export function formatRupees(paise: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}

/** "23 Nov, 3:30 pm" from an ISO date string, in Indian time (for clocks and history). */
export function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

/**
 * A clock in words: "by 23 Nov, 3:30 pm", or "overdue by 2h 5m" once the time has passed.
 * Never shows a negative time (SRS-TRD-05).
 */
export function dueText(isoDate: string, now: Date = new Date()): string {
  const late = now.getTime() - new Date(isoDate).getTime();
  if (late <= 0) return `by ${formatDateTime(isoDate)}`;
  const minutes = Math.floor(late / 60_000);
  return `overdue by ${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Today's date in India as YYYY-MM-DD (the value of `<input type="date">`). */
export function todayInIndia(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Paise as the text a person types into a rupee field: 5000000 -> "50000", 59950 -> "599.50". */
export function paiseToRupeesText(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** "1 box", "12 boxes". */
export function boxesText(count: number): string {
  return `${count} box${count === 1 ? '' : 'es'}`;
}
