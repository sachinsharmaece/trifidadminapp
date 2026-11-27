import { z } from 'zod';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_OUTCOMES,
  type ResolveComplaintInput,
} from '@/types/complaint';
import { checkForm, rupeesToPaise, wholeNumber, type FormResult } from './fields';

/** Form rules for raising and deciding a complaint. The server checks everything again. */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((text) => text || undefined);

export interface RaiseComplaintValues {
  category: string;
  reasonCodeId: string;
  /** Boxes the complaint is about; empty when it is about the whole order. */
  boxes: string;
  description: string;
}

/** "Buyer complains" (Sales): what it is about, the reason from the master, and an optional box count and detail. */
export const validateRaiseComplaint = (values: RaiseComplaintValues) =>
  checkForm(
    z.object({
      category: z.enum(COMPLAINT_CATEGORIES, 'Choose what the complaint is about'),
      reasonCodeId: z.string().min(1, 'Choose a reason'),
      boxes: z
        .string()
        .trim()
        .transform((text) => text || undefined)
        .pipe(wholeNumber('Enter a whole number of boxes', 1, 1_000_000).optional()),
      description: optionalText(500),
    }),
    values,
  );

export interface ResolveComplaintValues {
  outcome: string;
  /** Rupees, for a credit note. */
  amount: string;
  /** Boxes, for a replacement, return or refund. */
  boxes: string;
  note: string;
}

const note = z
  .string()
  .trim()
  .min(1, 'Write what was decided and why')
  .max(500, 'Use at most 500 characters');
const boxCount = wholeNumber('Enter the number of boxes', 1, 1_000_000);

/** The fields each outcome needs: nothing, rupees, or boxes. */
const byOutcome = {
  NO_ACTION: z.object({ outcome: z.literal('NO_ACTION'), note }),
  CREDIT: z
    .object({
      outcome: z.literal('CREDIT'),
      amount: rupeesToPaise('Enter the credit amount', 100_000_000),
      note,
    })
    .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount })),
  REPLACEMENT: z.object({ outcome: z.literal('REPLACEMENT'), boxes: boxCount, note }),
  RETURN: z.object({ outcome: z.literal('RETURN'), boxes: boxCount, note }),
  REFUND: z.object({ outcome: z.literal('REFUND'), boxes: boxCount, note }),
};

/** "Decide" (Controller): the outcome, its amount or boxes, and a note that Sales reads. */
export function validateResolveComplaint(
  values: ResolveComplaintValues,
): FormResult<ResolveComplaintInput> {
  const outcome = COMPLAINT_OUTCOMES.find((item) => item === values.outcome);
  if (!outcome) {
    // Say both things that are missing, so the person fixes them in one go.
    return {
      ok: false,
      errors: {
        outcome: 'Choose what is decided',
        ...(values.note.trim() ? {} : { note: 'Write what was decided and why' }),
      },
    };
  }
  return checkForm(byOutcome[outcome], values);
}
