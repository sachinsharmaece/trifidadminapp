import { z } from 'zod';
import { checkForm } from './fields';

/** Form rules for the Controller's Build 7 buttons: lost in transit and the payout hold. The server checks again. */

const MAX = 250;

export interface LostInTransitValues {
  note: string;
}

/** "Close as lost in transit": what the Controller found out (the history keeps it). */
export const validateLostInTransit = (values: LostInTransitValues) =>
  checkForm(
    z.object({
      note: z
        .string()
        .trim()
        .min(1, 'Write what you found out')
        .max(MAX, `Use at most ${MAX} characters`),
    }),
    values,
  );

export interface HoldPayoutValues {
  reason: string;
}

/** "Hold the payout": why the seller is not paid for now. */
export const validateHoldPayout = (values: HoldPayoutValues) =>
  checkForm(
    z.object({
      reason: z
        .string()
        .trim()
        .min(1, 'Say why the payout is held')
        .max(MAX, `Use at most ${MAX} characters`),
    }),
    values,
  );
