import { z } from 'zod';
import { REASON_CODE_CONTEXTS } from '@/types/reasonCode';
import { checkForm, nameText } from './fields';

const reasonCodeFormSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Enter a code')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Use letters, digits and _ (no spaces), like WRONG_PRICE')
    .max(40, 'Use at most 40 characters'),
  label: nameText('Enter the label shown in the dropdown', 120),
  context: z.enum(REASON_CODE_CONTEXTS, 'Choose where this reason is used'),
  sort: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter a whole number')
    .transform(Number)
    .refine((order) => order <= 10_000, 'Use a number up to 10,000'),
});

export interface ReasonCodeFormValues {
  code: string;
  label: string;
  context: string;
  sort: string;
}

export function validateReasonCodeForm(values: ReasonCodeFormValues) {
  return checkForm(reasonCodeFormSchema, values);
}
