import { z } from 'zod';
import { PRODUCT_CATEGORIES, SKU_CLASSES } from '@/types/product';
import { checkForm, nameText, percentToBp } from './fields';

/** One pack row: label like "500 ML", how many units are in a box, and its class. */
const packShape = {
  packLabel: nameText('Enter the pack label, like 500 ML', 40),
  unitsPerBox: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Enter a whole number')
    .transform(Number)
    .refine((units) => units >= 1 && units <= 10_000, 'Use a number from 1 to 10,000'),
  skuClass: z.enum(SKU_CLASSES, 'Choose a class'),
};

const detailsShape = {
  name: nameText('Enter the product name', 200),
  category: z.enum(PRODUCT_CATEGORIES, 'Choose a category'),
  manufacturerId: z.string().min(1, 'Choose a manufacturer'),
  technicalId: z.string().min(1, 'Choose a technical'),
  hsnCodeId: z.string().min(1, 'Choose an HSN code'),
  taxPercent: percentToBp('Enter the GST rate'),
};

/** The form has the GST rate as "taxPercent" text; the API wants it as `taxBp` (1800 = 18%). */
function renameTax<T extends { taxPercent: number }>({ taxPercent, ...rest }: T) {
  return { ...rest, taxBp: taxPercent };
}

const packSchema = z.object(packShape);
const productDetailsSchema = z.object(detailsShape).transform(renameTax);
const newProductSchema = z
  .object({
    ...detailsShape,
    skus: z.array(packSchema).min(1, 'Add at least one pack').max(20, 'At most 20 packs'),
  })
  .transform(renameTax);

export interface PackFormValues {
  packLabel: string;
  unitsPerBox: string;
  skuClass: string;
}

export interface ProductDetailsFormValues {
  name: string;
  category: string;
  manufacturerId: string;
  technicalId: string;
  hsnCodeId: string;
  taxPercent: string;
}

export interface NewProductFormValues extends ProductDetailsFormValues {
  skus: PackFormValues[];
}

export const emptyPack = (): PackFormValues => ({ packLabel: '', unitsPerBox: '', skuClass: 'A' });

export const validatePackForm = (values: PackFormValues) => checkForm(packSchema, values);

export const validateProductDetailsForm = (values: ProductDetailsFormValues) =>
  checkForm(productDetailsSchema, values);

export const validateNewProductForm = (values: NewProductFormValues) =>
  checkForm(newProductSchema, values);
