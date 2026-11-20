import { z } from 'zod';

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_FORMAT = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** The 15th character of a GSTIN is a check character worked out from the first 14 (same rule as the server). */
function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARS.indexOf(first14.charAt(i)) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS.charAt((36 - (sum % 36)) % 36);
}

/** True for a GSTIN in capital letters with the right format and check character, like 23ABCDE1234F1Z5. */
export function isValidGstin(gstin: string): boolean {
  return GSTIN_FORMAT.test(gstin) && gstin.charAt(14) === gstinCheckChar(gstin.slice(0, 14));
}

/** A required GSTIN: tidied to capital letters, then checked. */
export const gstinText = (requiredMessage: string) =>
  z
    .string()
    .trim()
    .toUpperCase()
    .min(1, requiredMessage)
    .refine(isValidGstin, 'Not a valid GSTIN. Check the letters, digits and last character');
