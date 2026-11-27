import { z } from 'zod';
import { todayInIndia } from '@/utils/format';
import { checkForm } from './fields';

/** Form rules for payouts. The server checks everything again. */

export interface BuildValues {
  bankLedgerId: string;
  purchaseOrderIds: string[];
  refundIds: string[];
}

/** "Build batch": one of our bank accounts and at least one payment. */
export const validateBuild = (values: BuildValues) =>
  checkForm(
    z
      .object({
        bankLedgerId: z.string().min(1, 'Choose the bank account the money leaves from'),
        purchaseOrderIds: z.array(z.string()),
        refundIds: z.array(z.string()),
      })
      .refine((input) => input.purchaseOrderIds.length + input.refundIds.length > 0, {
        message: 'Tick at least one payment',
        path: ['purchaseOrderIds'],
      }),
    values,
  );

export interface ProofValues {
  utr: string;
  paidOn: string;
}

/** "Add bank proof": the bank's UTR and the date it was paid (not in the future). */
export const validateProof = (values: ProofValues) =>
  checkForm(
    z.object({
      utr: z
        .string()
        .transform((text) => text.replace(/[\s-]/g, '').toUpperCase())
        .pipe(z.string().regex(/^[0-9A-Z]{6,30}$/, 'A UTR has 6 to 30 letters or digits')),
      paidOn: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the date it was paid')
        .refine((day) => day <= todayInIndia(), 'The date cannot be in the future'),
    }),
    values,
  );

/** "Release": the person types their password again. */
export const validateRelease = (values: { password: string }) =>
  checkForm(z.object({ password: z.string().min(1, 'Enter your password to release') }), values);
