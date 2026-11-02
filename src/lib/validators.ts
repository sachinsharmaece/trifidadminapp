/**
 * Copied from trifid-serverapp/src/shared/validators.ts (API_CONTRACT.md
 * §11.2 — no shared package between repositories). Used here only for
 * instant client-side feedback; the server re-validates independently.
 */
const GSTIN_SHAPE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const GSTIN_CODE_POINTS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function isValidGstin(gstin: string): boolean {
  if (!GSTIN_SHAPE.test(gstin)) return false;

  let factor = 2;
  let sum = 0;
  const mod = 36;
  for (let i = gstin.length - 2; i >= 0; i -= 1) {
    const codePoint = GSTIN_CODE_POINTS.indexOf(gstin[i]!);
    let digit = factor * codePoint;
    digit = Math.floor(digit / mod) + (digit % mod);
    sum += digit;
    factor = factor === 2 ? 1 : 2;
  }
  const checksumChar = GSTIN_CODE_POINTS[(mod - (sum % mod)) % mod];
  return checksumChar === gstin[14];
}

// DEC-054 — when a GSTIN is entered, the holder's PAN is its characters
// 3–12 (1-based), so the form fills PAN from it and locks it.
export function panFromGstin(gstin: string): string {
  return gstin.slice(2, 12);
}

// The first two digits of a GSTIN are the GST state code of the state it
// was issued in. "97 Other Territory" can never match: the GSTIN shape only
// allows a first digit of 0–3 there in practice, so no prefix check applies.
const STATE_CODE_WITHOUT_GSTIN_PREFIX = '97';

export function gstinMatchesStateCode(gstin: string, gstStateCode: string): boolean {
  if (gstStateCode === STATE_CODE_WITHOUT_GSTIN_PREFIX) return true;
  return gstin.slice(0, 2) === gstStateCode;
}

// Mobile: a 10-digit Indian mobile, after stripping what people commonly
// type around it — spaces/hyphens, a `+91` (or bare `91` on a 12-digit
// number) country code, or a leading trunk `0`.
const MOBILE_SHAPE = /^[6-9]\d{9}$/;

export function normalizeMobile(raw: string): string {
  let digits = raw.replace(/[\s-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function isValidMobile(raw: string): boolean {
  return MOBILE_SHAPE.test(normalizeMobile(raw));
}

// PAN: 5 letters, 4 digits, 1 letter. The 4th character is the holder type
// (P person, F firm, C company, H HUF, ...) — an employee's PAN must be a
// person's; a buyer's or seller's may be any holder type.
const PAN_SHAPE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export function isValidPan(pan: string, options: { personOnly?: boolean } = {}): boolean {
  if (!PAN_SHAPE.test(pan)) return false;
  return !options.personOnly || pan[3] === 'P';
}

// Aadhaar: 12 digits, never starting 0 or 1, last digit a Verhoeff check
// digit over the first eleven (UIDAI's published scheme).
const AADHAAR_SHAPE = /^[2-9]\d{11}$/;
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** True when `digits` (check digit last) passes the Verhoeff check. */
export function passesVerhoeff(digits: string): boolean {
  let c = 0;
  const reversed = digits.split('').reverse();
  for (let i = 0; i < reversed.length; i += 1) {
    c = VERHOEFF_D[c]![VERHOEFF_P[i % 8]![Number(reversed[i])]!]!;
  }
  return c === 0;
}

export function isValidAadhaar(aadhaar: string): boolean {
  return AADHAAR_SHAPE.test(aadhaar) && passesVerhoeff(aadhaar);
}

// Pincode: six digits, never starting with 0.
const PINCODE_SHAPE = /^[1-9]\d{5}$/;

export function isValidPincode(pincode: string): boolean {
  return PINCODE_SHAPE.test(pincode);
}

const IFSC_SHAPE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

export function isValidIfsc(ifsc: string): boolean {
  return IFSC_SHAPE.test(ifsc);
}
