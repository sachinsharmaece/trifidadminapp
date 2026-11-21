import { z } from 'zod';
import { TRADE_POSITIONS } from '@/types/party';
import { checkForm, nameText } from './fields';
import { isValidGstin } from './ids';

const optionalText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);
const requiredText = (message: string, max: number) =>
  z.string().trim().min(1, message).max(max, `Use at most ${max} characters`);

/** "98260 11111, 9000000010": numbers are separated by commas (or new lines); spaces inside a number are dropped. */
const mobilesFromText = z
  .string()
  .transform((text) =>
    text
      .split(/[,;\n]+/)
      .map((item) => item.replace(/[\s-]/g, ''))
      .filter(Boolean),
  )
  .superRefine((list, ctx) => {
    if (list.length === 0) {
      ctx.addIssue({ code: 'custom', message: 'Enter at least one mobile number' });
      return;
    }
    if (list.length > 5) {
      ctx.addIssue({ code: 'custom', message: 'At most 5 mobile numbers' });
    }
    const wrong = list.filter((mobile) => !/^\d{10}$/.test(mobile));
    if (wrong.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Not a 10-digit mobile number: ${wrong.slice(0, 2).join(', ')}`,
      });
    }
  })
  .transform((list) => [...new Set(list)]);

/** The GSTIN is optional: a buyer without one is a consumer (B2C). */
const optionalGstin = z
  .string()
  .trim()
  .toUpperCase()
  .refine(
    (gstin) => gstin === '' || isValidGstin(gstin),
    'Not a valid GSTIN. Check the letters, digits and last character',
  );

const buyerFormSchema = z.object({
  firmName: nameText('Enter the firm name', 200),
  contactName: nameText('Enter the contact person', 100),
  mobiles: mobilesFromText,
  gstin: optionalGstin,
  tehsilId: z.string().min(1, 'Choose a tehsil'),
  village: optionalText(100),
  address: requiredText('Enter the address', 500),
  deliveryLocation: requiredText('Enter the delivery location', 300),
  tradePosition: z.enum(TRADE_POSITIONS, 'Choose what kind of trader this is'),
  traderFlag: z.boolean(),
  manufacturerIds: z.array(z.string()),
});

export interface BuyerFormValues {
  firmName: string;
  contactName: string;
  /** The numbers as typed, like "9826011111, 9000000010". */
  mobiles: string;
  gstin: string;
  tehsilId: string;
  village: string;
  address: string;
  deliveryLocation: string;
  /** '' until the person chooses. */
  tradePosition: string;
  traderFlag: boolean;
  manufacturerIds: string[];
}

export function validateBuyerForm(values: BuyerFormValues) {
  return checkForm(buyerFormSchema, values);
}
