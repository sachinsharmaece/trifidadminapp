import { z } from 'zod';
import { checkForm, nameText } from './fields';

const PINCODE = /^[1-9]\d{5}$/;

/** What the person types in the pincodes box: "452001, 452002" (commas, spaces or new lines between them). */
const pincodesFromText = z
  .string()
  .transform((text) => text.split(/[\s,;]+/).filter(Boolean))
  .refine((list) => list.length <= 100, 'At most 100 pincodes')
  .superRefine((list, ctx) => {
    const wrong = list.filter((pincode) => !PINCODE.test(pincode));
    if (wrong.length > 0) {
      ctx.addIssue({
        code: 'custom',
        message: `Not a valid pincode: ${wrong.slice(0, 3).join(', ')}. A pincode has 6 digits and does not start with 0.`,
      });
    }
  });

const tehsilFormSchema = z.object({
  state: nameText('Enter the state', 60),
  district: nameText('Enter the district', 80),
  name: nameText('Enter the tehsil name', 80),
  pincodes: pincodesFromText,
});

export interface TehsilFormValues {
  state: string;
  district: string;
  name: string;
  /** The pincodes as typed, like "452001, 452002". */
  pincodes: string;
}

export function validateTehsilForm(values: TehsilFormValues) {
  return checkForm(tehsilFormSchema, values);
}
