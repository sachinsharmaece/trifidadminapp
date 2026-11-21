import { z } from 'zod';
import type { MarginCellInput } from '@/features/margins/api';
import { BUYER_TIERS } from '@/types/margin';
import { SKU_CLASSES } from '@/types/product';
import { checkForm, percentToBp, type FormResult } from './fields';

/** A chosen start date begins at midnight Indian time. */
const INDIA_OFFSET = '+05:30';

/** Today's date in India as "2026-11-21". Used as the earliest start date and as the default. */
export function todayInIndia(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

const marginFormSchema = z.object({
  skuClass: z.enum(SKU_CLASSES, 'Choose a class'),
  buyerTier: z.enum(BUYER_TIERS, 'Choose a tier'),
  marginPercent: percentToBp('Enter the margin'),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the start date'),
  password: z.string().min(1, 'Enter your password to confirm'),
});

/** What the person types. Everything is text. */
export interface MarginFormValues {
  skuClass: string;
  buyerTier: string;
  /** "20" or "22.5" */
  marginPercent: string;
  /** "2026-12-01" */
  startsOn: string;
  password: string;
}

/** On success: the cell for the API, and the password for the step-up check that comes before saving it. */
export function validateMarginForm(
  values: MarginFormValues,
): FormResult<{ cell: MarginCellInput; password: string }> {
  const result = checkForm(marginFormSchema, values);
  if (!result.ok) return result;

  const { skuClass, buyerTier, marginPercent, startsOn, password } = result.data;
  const today = todayInIndia();
  if (startsOn < today) {
    return { ok: false, errors: { startsOn: 'The start date cannot be in the past' } };
  }
  // Today means "start right away" (the server uses the current time). A later date starts at midnight.
  const effectiveFrom = startsOn === today ? undefined : `${startsOn}T00:00:00${INDIA_OFFSET}`;
  return {
    ok: true,
    data: { password, cell: { skuClass, buyerTier, marginBp: marginPercent, effectiveFrom } },
  };
}
