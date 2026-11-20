import { z } from 'zod';
import { checkForm, nameText } from './fields';

const technicalFormSchema = z.object({
  name: nameText('Enter the technical name'),
  description: z.string().trim().max(300, 'Use at most 300 characters'),
});

export type TechnicalFormValues = { name: string; description: string };

export function validateTechnicalForm(values: TechnicalFormValues) {
  return checkForm(technicalFormSchema, values);
}
