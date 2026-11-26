import { z } from 'zod';
import { BANK_KINDS } from '@/types/books';
import { checkForm, nameText } from './fields';

export interface BankAccountFormValues {
  name: string;
  kind: string;
  bankName: string;
  ifsc: string;
  accountNumber: string;
}

/**
 * A bank account. When editing, an empty account number keeps the one already saved (it is never shown again).
 */
export function validateBankAccountForm(values: BankAccountFormValues, isNew: boolean) {
  return checkForm(
    z.object({
      name: nameText('Enter a name, e.g. "HDFC Current 4321"', 120),
      kind: z.enum(BANK_KINDS, 'Choose the kind'),
      bankName: z.string().trim().min(1, 'Enter the bank name').max(100),
      ifsc: z
        .string()
        .trim()
        .toUpperCase()
        .regex(
          /^[A-Z]{4}0[A-Z0-9]{6}$/,
          'An IFSC code is 4 letters, a zero, then 6 letters or digits',
        ),
      accountNumber: isNew
        ? z
            .string()
            .trim()
            .regex(/^\d{9,18}$/, 'An account number has 9 to 18 digits')
        : z
            .string()
            .trim()
            .regex(/^(\d{9,18})?$/, 'An account number has 9 to 18 digits')
            .transform((text) => text || undefined),
    }),
    values,
  );
}
