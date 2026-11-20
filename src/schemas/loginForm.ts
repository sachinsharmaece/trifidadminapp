import { z } from 'zod';

/** UI-only validation for the sign-in form: friendly per-field messages and a trimmed email. */
const loginFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address')
    .pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginFormValues = z.input<typeof loginFormSchema>;
export type LoginFormData = z.output<typeof loginFormSchema>;
export type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

export type LoginFormResult =
  { ok: true; data: LoginFormData } | { ok: false; errors: LoginFormErrors };

/** Checks what the user typed. Returns the cleaned values, or one error message per bad field. */
export function validateLoginForm(values: LoginFormValues): LoginFormResult {
  const result = loginFormSchema.safeParse(values);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const { fieldErrors } = z.flattenError(result.error);
  return {
    ok: false,
    errors: { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] },
  };
}
