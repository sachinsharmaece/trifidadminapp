/**
 * How a sheet's "expiry year / month" becomes what a listing stores. "25-27" is the stock made in
 * 2025 and expiring in 2027, so the expiry year is the second number; the month is the expiry month.
 * The board only ever shows a band, Over or Under 12 months (BR-102), so the band is worked out
 * from the date and the exact month rides along as MM/YYYY.
 */
export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const SHELF_LIFE_YEARS = 2;

export interface ExpiryYearOption {
  /** The expiry year, as the select's value. */
  value: string;
  /** "25-27". */
  label: string;
}

const twoDigits = (year: number): string => String(year % 100).padStart(2, '0');

/** Stock made last year to two years from now, each as "made-expires": 25-27, 26-28, 27-29, 28-30. */
export function expiryYearOptions(now: Date = new Date()): ExpiryYearOption[] {
  const thisYear = now.getFullYear();
  const options: ExpiryYearOption[] = [];
  for (let made = thisYear - 1; made <= thisYear + 2; made += 1) {
    const expires = made + SHELF_LIFE_YEARS;
    options.push({ value: String(expires), label: `${twoDigits(made)}-${twoDigits(expires)}` });
  }
  return options;
}

/** MM/YYYY, the form the server stores. `month` is 1–12. */
export function expiryExactOf(expiryYear: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${expiryYear}`;
}

/** The year pair that starts this year (26-28 in 2026), as its expiry year: what the rows open on. */
export function defaultExpiryYear(now: Date = new Date()): string {
  return String(now.getFullYear() + SHELF_LIFE_YEARS);
}

export type ExpiryBandResult = 'over12' | 'under12' | 'expired';

/**
 * Over 12 months when the end of the expiry month is more than a year away; Under 12 months when
 * it is nearer; "expired" when that month is already over. No six-month floor here (DEC-071).
 * The month is optional: without one it is counted from January, the earliest it could be, so the
 * band never promises more than the year does.
 */
export function bandOfExpiry(
  expiryYear: number,
  month: number | null,
  now: Date = new Date(),
): ExpiryBandResult {
  const endOfMonth = new Date(expiryYear, month ?? 1, 0, 23, 59, 59);
  if (endOfMonth.getTime() < now.getTime()) return 'expired';
  const aYearOn = new Date(now.getTime());
  aYearOn.setFullYear(aYearOn.getFullYear() + 1);
  return endOfMonth.getTime() > aYearOn.getTime() ? 'over12' : 'under12';
}
