import { z } from 'zod';
import { checkForm, nameText } from './fields';
import { gstinText } from './ids';

/**
 * What the person types. The bank fields may be empty. An empty account number means "keep the one already
 * saved" (the saved number is never sent to the browser).
 */
const companyFormSchema = z
  .object({
    name: nameText('Enter the company name', 200),
    gstin: gstinText('Enter the GSTIN'),
    address: z.string().trim().min(1, 'Enter the address').max(500, 'Use at most 500 characters'),
    accountNumber: z
      .string()
      .trim()
      .transform((text) => text.replace(/[\s-]/g, '')) // people paste "1234 5678 9012"
      .pipe(z.string().regex(/^(\d{9,18})?$/, 'An account number has 9 to 18 digits')),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^([A-Z]{4}0[A-Z0-9]{6})?$/,
        'An IFSC code is 4 letters, a zero, then 6 letters or digits',
      ),
    bankName: z.string().trim().max(100, 'Use at most 100 characters'),
  })
  .transform(({ accountNumber, ifsc, bankName, ...rest }) => ({
    ...rest,
    bank: { accountNumber, ifsc, bankName },
  }));

export type CompanyFormValues = {
  name: string;
  gstin: string;
  address: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
};

export function validateCompanyForm(values: CompanyFormValues) {
  return checkForm(companyFormSchema, values);
}
