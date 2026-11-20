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

/** Basis points as a plain number of percent: 1800 -> "18", 250 -> "2.5". */
export function bpToPercentText(basisPoints: number): string {
  return String(basisPoints / 100);
}

/** Basis points as a percentage for display: 1800 -> "18%". */
export function formatPercent(basisPoints: number): string {
  return `${bpToPercentText(basisPoints)}%`;
}
