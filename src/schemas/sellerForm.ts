import { z } from 'zod';
import { checkForm, nameText } from './fields';
import { gstinText } from './ids';

/** A 10-digit mobile number. People type "98765 43210" or "98765-43210": spaces and dashes are dropped. */
export const mobileText = z
  .string()
  .trim()
  .min(1, 'Enter the mobile number')
  .transform((text) => text.replace(/[\s-]/g, ''))
  .pipe(z.string().regex(/^\d{10}$/, 'A mobile number has 10 digits'));

const optionalText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);

/**
 * What the person types. The account number box starts empty when editing: the saved number is never sent
 * to the browser. Leaving it empty then means "keep the saved number".
 */
function sellerFormSchema(hasSavedAccount: boolean) {
  return z
    .object({
      firmName: nameText('Enter the firm name', 200),
      gstin: gstinText('Enter the GSTIN'),
      mobile: mobileText,
      contactName: optionalText(100),
      tehsilId: z.string().min(1, 'Choose a tehsil'),
      address: optionalText(500),
      dispatchCutoff: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Choose the cut-off time'),
      manufacturerIds: z.array(z.string()),
      accountNumber: z
        .string()
        .trim()
        .transform((text) => text.replace(/[\s-]/g, ''))
        .pipe(
          z
            .string()
            .regex(
              hasSavedAccount ? /^(\d{9,18})?$/ : /^\d{9,18}$/,
              'An account number has 9 to 18 digits',
            ),
        ),
      ifsc: z
        .string()
        .trim()
        .toUpperCase()
        .regex(
          /^[A-Z]{4}0[A-Z0-9]{6}$/,
          'An IFSC code is 4 letters, a zero, then 6 letters or digits',
        ),
      bankName: nameText('Enter the bank name', 100),
      holderName: nameText('Enter the account holder name', 150),
    })
    .transform(({ accountNumber, ifsc, bankName, holderName, ...rest }) => ({
      ...rest,
      // No account number is sent when the box was left empty (keep the saved one).
      bank: { ...(accountNumber ? { accountNumber } : {}), ifsc, bankName, holderName },
    }));
}

export interface SellerFormValues {
  firmName: string;
  gstin: string;
  mobile: string;
  contactName: string;
  tehsilId: string;
  address: string;
  /** "HH:mm", like "17:30". */
  dispatchCutoff: string;
  manufacturerIds: string[];
  accountNumber: string;
  ifsc: string;
  bankName: string;
  holderName: string;
}

export function validateSellerForm(values: SellerFormValues, hasSavedAccount: boolean) {
  return checkForm(sellerFormSchema(hasSavedAccount), values);
}
