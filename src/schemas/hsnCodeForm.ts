import { z } from 'zod';
import { checkForm, percentToBp } from './fields';

/** What the person types: the GST rate is text like "18". The cleaned result has it as `gstBp` (1800). */
const hsnCodeFormSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^(\d{4}|\d{6}|\d{8})$/, 'An HSN code has 4, 6 or 8 digits'),
    description: z.string().trim().max(300, 'Use at most 300 characters'),
    gstPercent: percentToBp('Enter the GST rate'),
  })
  .transform(({ gstPercent, ...rest }) => ({ ...rest, gstBp: gstPercent }));

export type HsnCodeFormValues = { code: string; description: string; gstPercent: string };

export function validateHsnCodeForm(values: HsnCodeFormValues) {
  return checkForm(hsnCodeFormSchema, values);
}
