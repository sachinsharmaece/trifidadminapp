import { z } from 'zod';
import { ASK_REASONS, DECLINE_REASONS } from '@/types/trade';
import { checkForm, expiryMonthText, rupeesToPaise, wholeNumber } from './fields';

/** Form rules for the deal card buttons and the ask form. The server checks everything again. */

const boxes = wholeNumber('Enter the number of boxes', 1, 1_000_000);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((text) => text || undefined);

export interface WantItValues {
  boxes: string;
}
export const validateWantIt = (values: WantItValues) => checkForm(z.object({ boxes }), values);

export interface ConfirmStockValues {
  boxes: string;
  expiryMonth: string;
  batchNumber: string;
}
export const validateConfirmStock = (values: ConfirmStockValues) =>
  checkForm(
    z.object({ boxes, expiryMonth: expiryMonthText, batchNumber: optionalText(60) }),
    values,
  );

export interface DeclineValues {
  reason: string;
  note: string;
}
export const validateDecline = (values: DeclineValues) =>
  checkForm(
    z
      .object({ reason: z.enum(DECLINE_REASONS, 'Choose a reason'), note: optionalText(300) })
      .refine((value) => value.reason !== 'OTHER' || value.note, {
        path: ['note'],
        message: 'Write a short note for "Other"',
      }),
    values,
  );

export interface QuoteValues {
  skuId: string;
  landedRupees: string;
  expiryMonth: string;
  moqBoxes: string;
  boxesAvailable: string;
  batchNumber: string;
}
export const validateQuote = (values: QuoteValues) =>
  checkForm(
    z.object({
      skuId: z.string().min(1, 'Choose the pack'),
      landedRupees: rupeesToPaise('Enter the rate per unit', 1_000_000),
      expiryMonth: expiryMonthText,
      moqBoxes: boxes,
      boxesAvailable: boxes,
      batchNumber: optionalText(60),
    }),
    values,
  );

export interface ReasonValues {
  reasonCodeId: string;
  note: string;
}
/** "Buyer says no" and "Buyer drops the order": a reason from the reason codes master, and a note. */
export const validateReason = (values: ReasonValues) =>
  checkForm(
    z.object({
      reasonCodeId: z.string().min(1, 'Choose a reason'),
      note: optionalText(300),
    }),
    values,
  );

export interface PaymentValues {
  bankLedgerId: string;
  utr: string;
  amount: string;
  receivedOn: string;
}
/** "Enter payment": our bank account, the UTR, the amount in rupees (sent as paise) and the day it came in. */
export const validatePayment = (values: PaymentValues) =>
  checkForm(
    z
      .object({
        bankLedgerId: z.string().min(1, 'Choose the bank account'),
        utr: z
          .string()
          .transform((text) => text.replace(/[\s-]/g, '').toUpperCase())
          .pipe(z.string().regex(/^[0-9A-Z]{6,30}$/, 'A UTR has 6 to 30 letters or digits')),
        amount: rupeesToPaise('Enter the amount', 100_000_000),
        receivedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose the date the money came in'),
      })
      .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount })),
    values,
  );

export interface PaymentChoiceValues {
  receiptId: string;
  note: string;
}
/** "Confirm payment" / "Payment not received" on the deal card: which entry, and (for not received) why. */
export const validatePaymentChoice = (values: PaymentChoiceValues, needsNote: boolean) =>
  checkForm(
    z.object({
      receiptId: z.string().min(1, 'Choose the payment'),
      note: needsNote
        ? z.string().trim().min(1, 'Say what was wrong').max(300)
        : z.string().trim().max(300),
    }),
    values,
  );

export interface AskValues {
  boxes: string;
  reason: string;
  note: string;
}
export const validateAsk = (values: AskValues) =>
  checkForm(
    z
      .object({
        boxes,
        reason: z.enum(ASK_REASONS, 'Choose why the buyer is asking'),
        note: optionalText(500),
      })
      .refine((value) => value.reason !== 'OTHER' || value.note, {
        path: ['note'],
        message: 'Write a short note for "Other"',
      }),
    values,
  );
