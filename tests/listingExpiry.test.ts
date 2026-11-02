import { describe, expect, it } from 'vitest';
import {
  bandOfExpiry,
  expiryExactOf,
  expiryYearOptions,
} from '../src/desks/purchase/listingExpiry';

const now = new Date(2026, 10, 2); // 2 Nov 2026.

describe('The expiry on a price sheet (25-27, March)', () => {
  it('offers "made-expires" pairs, the second number being the expiry year', () => {
    expect(expiryYearOptions(now)).toEqual([
      { value: '2027', label: '25-27' },
      { value: '2028', label: '26-28' },
      { value: '2029', label: '27-29' },
      { value: '2030', label: '28-30' },
    ]);
  });

  it('stores the exact month as MM/YYYY', () => {
    expect(expiryExactOf(2027, 3)).toBe('03/2027');
    expect(expiryExactOf(2028, 12)).toBe('12/2028');
  });

  it('works the band out from the end of the expiry month', () => {
    expect(bandOfExpiry(2028, 3, now)).toBe('over12');
    expect(bandOfExpiry(2027, 11, now)).toBe('over12'); // Ends 30 Nov 2027, more than a year off.
    expect(bandOfExpiry(2027, 10, now)).toBe('under12'); // Ends 31 Oct 2027, a little under.
    expect(bandOfExpiry(2027, 3, now)).toBe('under12'); // Four months: no six-month floor (DEC-071).
    expect(bandOfExpiry(2026, 11, now)).toBe('under12'); // This month is not over yet.
    expect(bandOfExpiry(2026, 10, now)).toBe('expired');
  });
});
