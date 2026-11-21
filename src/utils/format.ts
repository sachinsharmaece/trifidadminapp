/** "18 Nov 2026" from an ISO date string. Returns the original text if it is not a valid date. */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
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
