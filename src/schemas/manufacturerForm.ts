import { z } from 'zod';
import { checkForm, nameText } from './fields';

const manufacturerFormSchema = z.object({ name: nameText('Enter the manufacturer name') });

export type ManufacturerFormValues = { name: string };

export function validateManufacturerForm(values: ManufacturerFormValues) {
  return checkForm(manufacturerFormSchema, values);
}
