/**
 * Every date on screen reads DD/MM/YYYY in IST, whatever the browser's own
 * locale or time zone — `toLocaleDateString()` with no arguments showed
 * MM/DD/YYYY on a US-locale machine and the wrong day near midnight outside
 * India.
 */
const DATE_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const TIME_PARTS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function toDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `21/10/2026`. An unparseable value reads as an em dash, never "Invalid Date". */
export function formatDate(value: string | number | Date): string {
  const date = toDate(value);
  return date ? DATE_PARTS.format(date) : '—';
}

/** `21/10/2026 14:05` (24-hour, IST). */
export function formatDateTime(value: string | number | Date): string {
  const date = toDate(value);
  return date ? `${DATE_PARTS.format(date)} ${TIME_PARTS.format(date)}` : '—';
}
