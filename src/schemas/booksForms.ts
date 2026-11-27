import { z } from 'zod';
import { HAND_LEDGER_GROUPS } from '@/types/books';
import { todayInIndia } from '@/utils/format';
import { checkForm, nameText, rupeesToPaise } from './fields';

/** Form rules for the books: hand-added payments, ledgers, journals, reversals and bank reconciliation. The server checks everything again. */

const day = (message: string) =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, message)
    .refine((text) => text <= todayInIndia(), 'The date cannot be in the future');

export interface HandPaymentValues {
  bankLedgerId: string;
  buyerId: string;
  utr: string;
  amount: string;
  receivedOn: string;
  note: string;
}

/** "Add a payment": money that reached the bank with no order. */
export const validateHandPayment = (values: HandPaymentValues) =>
  checkForm(
    z.object({
      bankLedgerId: z.string().min(1, 'Choose the bank account the money reached'),
      buyerId: z.string().min(1, 'Choose the buyer who paid'),
      utr: z
        .string()
        .transform((text) => text.replace(/[\s-]/g, '').toUpperCase())
        .pipe(z.string().regex(/^[0-9A-Z]{6,30}$/, 'A UTR has 6 to 30 letters or digits')),
      amount: rupeesToPaise('Enter the amount', 1_000_000_000),
      receivedOn: day('Choose the date the money came in'),
      note: z
        .string()
        .trim()
        .max(300, 'Use at most 300 characters')
        .transform((text) => text || undefined),
    }),
    values,
  );

export interface LedgerValues {
  name: string;
  group: string;
}

/** "Add a ledger": a name and one of the groups that may be added by hand. */
export const validateLedger = (values: LedgerValues) =>
  checkForm(
    z.object({
      name: nameText('Enter the ledger name', 100),
      group: z.enum(HAND_LEDGER_GROUPS, { message: 'Choose a group' }),
    }),
    values,
  );

/** Rename a hand ledger. */
export const validateLedgerName = (values: { name: string }) =>
  checkForm(z.object({ name: nameText('Enter the ledger name', 100) }), values);

export interface JournalLineValues {
  /** What the picker chose: a ledger, or a buyer / seller who has no ledger yet. */
  choice:
    | { kind: 'LEDGER'; ledgerId: string }
    | { kind: 'PARTY'; side: 'BUYER' | 'SELLER'; id: string }
    | null;
  /** Shown in the box (the name of the choice). */
  text: string;
  dr: string;
  cr: string;
}
export interface JournalValues {
  kind: 'JOURNAL' | 'OPENING';
  date: string;
  narration: string;
  lines: JournalLineValues[];
}

const money = rupeesToPaise('Enter an amount', 1_000_000_000);

/**
 * "New entry": two or more lines, each a ledger with a debit OR a credit above zero, and debits equal to credits.
 * (An amount left empty means "none"; zero is not an amount.)
 */
export const validateJournal = (values: JournalValues) => {
  const errors: Record<string, string> = {};
  const lines = values.lines.map((line, index) => {
    const dr = line.dr.trim() ? money.safeParse(line.dr) : null;
    const cr = line.cr.trim() ? money.safeParse(line.cr) : null;
    if (!line.choice) errors[`lines.${index}.ledgerId`] = 'Choose a ledger from the list';
    if (dr && !dr.success)
      errors[`lines.${index}.drPaise`] =
        dr.error.issues[0]?.message ?? 'Use an amount like 600 or 599.50';
    else if (cr && !cr.success)
      errors[`lines.${index}.crPaise`] =
        cr.error.issues[0]?.message ?? 'Use an amount like 600 or 599.50';
    else if (!dr && !cr) errors[`lines.${index}.drPaise`] = 'Enter a debit or a credit';
    else if (dr?.success && cr?.success)
      errors[`lines.${index}.drPaise`] = 'A line is a debit or a credit, not both';
    else if ((dr?.success && dr.data === 0) || (cr?.success && cr.data === 0))
      errors[`lines.${index}.drPaise`] = 'An amount must be above zero';
    return {
      choice: line.choice,
      drPaise: dr?.success ? dr.data : 0,
      crPaise: cr?.success ? cr.data : 0,
    };
  });
  const date = day('Choose the date of the entry').safeParse(values.date);
  if (!date.success) errors.date = date.error.issues[0]?.message ?? 'Choose the date of the entry';
  const narration = values.narration.trim();
  if (!narration) errors.narration = 'Write what this entry is for';
  else if (narration.length > 280) errors.narration = 'Use at most 280 characters';
  if (lines.length < 2) errors.lines = 'Use two or more lines';
  const dr = lines.reduce((sum, line) => sum + line.drPaise, 0);
  const cr = lines.reduce((sum, line) => sum + line.crPaise, 0);
  if (Object.keys(errors).length === 0 && dr !== cr)
    errors.lines = 'Debits and credits must be equal';
  if (Object.keys(errors).length > 0) return { ok: false as const, errors };
  return {
    ok: true as const,
    data: {
      kind: values.kind,
      date: values.date,
      narration,
      lines: lines.map((line) => {
        const choice = line.choice;
        return {
          ...(choice?.kind === 'PARTY'
            ? { party: { side: choice.side, id: choice.id } }
            : { ledgerId: choice?.ledgerId ?? '' }),
          drPaise: line.drPaise,
          crPaise: line.crPaise,
        };
      }),
    },
  };
};

/** Saying no to a journal needs a reason. */
export const validateReason = (values: { reason: string }, message = 'Say why') =>
  checkForm(
    z.object({ reason: z.string().trim().min(1, message).max(300, 'Use at most 300 characters') }),
    values,
  );

/** "Reverse": a reason (up to 200 characters) and the person's password again. */
export const validateReverse = (values: { reason: string; password: string }) =>
  checkForm(
    z.object({
      reason: z
        .string()
        .trim()
        .min(1, 'Say why it is reversed')
        .max(200, 'Use at most 200 characters'),
      password: z.string().min(1, 'Enter your password to reverse'),
    }),
    values,
  );

export interface ReconcileValues {
  bankLedgerId: string;
  date: string;
  statement: string;
}

/** The closing balance printed on the bank statement, as rupees; "-" in front means the account is overdrawn. */
export const validateReconcile = (values: ReconcileValues) =>
  checkForm(
    z.object({
      bankLedgerId: z.string().min(1, 'Choose the bank account'),
      date: day('Choose the statement date'),
      statement: z
        .string()
        .trim()
        .regex(
          /^-?\d{1,9}(\.\d{1,2})?$/,
          'Use an amount like 125000 or 125000.50 (a minus sign if overdrawn)',
        )
        .transform((text) => {
          const negative = text.startsWith('-');
          const [rupees = '0', paise = ''] = text.replace('-', '').split('.');
          const total = Number(rupees) * 100 + Number(paise.padEnd(2, '0'));
          return negative ? -total : total;
        }),
    }),
    values,
  );
