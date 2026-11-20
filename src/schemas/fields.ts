import { z } from 'zod';

/** Messages to show under form fields, keyed by field name ("name") or row path ("packs.0.packLabel"). */
export type FormErrors = Record<string, string | undefined>;

/** The result of checking a form: the cleaned values, or one message per field that is wrong. */
export type FormResult<Data> = { ok: true; data: Data } | { ok: false; errors: FormErrors };

/** Turns a Zod failure into one message per field (the first problem of each). */
export function toFormErrors(error: z.ZodError): FormErrors {
  const errors: FormErrors = {};
  for (const issue of error.issues) {
    errors[issue.path.join('.')] ??= issue.message;
  }
  return errors;
}

/** Runs a schema over the form values and returns a `FormResult`. */
export function checkForm<Schema extends z.ZodType>(
  schema: Schema,
  values: unknown,
): FormResult<z.output<Schema>> {
  const result = schema.safeParse(values);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, errors: toFormErrors(result.error) };
}

/** A required name: trimmed, with repeated spaces tidied (the server does the same). */
export const nameText = (message: string, max = 150) =>
  z
    .string()
    .trim()
    .min(1, message)
    .max(max, `Use at most ${max} characters`)
    .transform((text) => text.replace(/\s+/g, ' '));

/**
 * A percentage typed by a person ("18" or "2.5"), turned into basis points (1800 or 250) for the API.
 * Up to two decimals, between 0 and 100.
 */
export const percentToBp = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .regex(/^\d{1,3}(\.\d{1,2})?$/, 'Use a number like 18 or 2.5')
    .transform((text) => Math.round(Number(text) * 100))
    .refine((basisPoints) => basisPoints <= 10_000, 'It cannot be more than 100%');
