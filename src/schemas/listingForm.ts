import { z } from 'zod';
import { EXPIRY_BANDS, PROVENANCES } from '@/types/listing';
import type { ListingInput } from '@/features/listings/api';
import { checkForm, rupeesToPaise, wholeNumber, type FormResult } from './fields';

// The same limits as the server (models/listing.model.ts).
const MAX_RATE_RUPEES = 100_000;
const MAX_COL_RUPEES = 10_000_000;

const rate = (message: string) =>
  rupeesToPaise(message, MAX_RATE_RUPEES).refine(
    (paise) => paise > 0,
    'The rate must be more than 0',
  );

/** The parts every listing has, whatever its rate type. */
const commonShape = {
  sellerId: z.string().min(1, 'Choose a seller'),
  skuId: z.string().min(1, 'Choose a product pack'),
  expiryBand: z.enum(EXPIRY_BANDS, 'Choose the shelf life'),
  moqBoxes: wholeNumber('Enter a whole number of boxes', 1, 10_000),
  quantityBoxes: wholeNumber('Enter a whole number of boxes', 1, 1_000_000),
  provenance: z.enum(PROVENANCES, 'Choose where the goods come from'),
};

// FOR Indore: one landed rate. Ex rate + COL: the server adds COL (split over the units in a box) to the Ex rate.
const forSchema = z.object({
  ...commonShape,
  rateType: z.literal('FOR'),
  ratePaisePerUnit: rate('Enter the rate per unit'),
});
const exSchema = z.object({
  ...commonShape,
  rateType: z.literal('EX'),
  exRatePaisePerUnit: rate('Enter the Ex rate per unit'),
  colPaisePerBox: rupeesToPaise('Enter the COL per box (0 if none)', MAX_COL_RUPEES),
});

/** What the person types. Everything is text; the schema turns it into numbers and paise. */
export interface ListingFormValues {
  sellerId: string;
  skuId: string;
  rateType: 'FOR' | 'EX';
  /** FOR: the rate per unit, in rupees. */
  ratePaisePerUnit: string;
  /** EX: the Ex rate per unit and the COL per box, in rupees. */
  exRatePaisePerUnit: string;
  colPaisePerBox: string;
  expiryBand: string;
  moqBoxes: string;
  quantityBoxes: string;
  provenance: string;
}

/** Checks the form. On success `data` is exactly what the API wants (without `confirmDecrease`). */
export function validateListingForm(values: ListingFormValues): FormResult<ListingInput> {
  // Each schema looks only at its own fields (extra ones are ignored), so a hidden field can never block saving.
  return checkForm(values.rateType === 'FOR' ? forSchema : exSchema, values);
}
