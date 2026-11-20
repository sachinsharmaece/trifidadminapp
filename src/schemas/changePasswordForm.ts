import { z } from 'zod';

/** The server also checks the length (PASSWORD_MIN_LENGTH in trifidserverapp). Keep the two numbers equal. */
const PASSWORD_MIN_LENGTH = 10;

/** UI-only validation for the change-password form. */
const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The two passwords are different',
  });

export type ChangePasswordFormValues = z.input<typeof changePasswordFormSchema>;
export type ChangePasswordFormErrors = Partial<Record<keyof ChangePasswordFormValues, string>>;

export type ChangePasswordFormResult =
  | { ok: true; data: { currentPassword: string; newPassword: string } }
  | { ok: false; errors: ChangePasswordFormErrors };

/** Checks what the user typed. Returns the passwords to send, or one error message per bad field. */
export function validateChangePasswordForm(
  values: ChangePasswordFormValues,
): ChangePasswordFormResult {
  const result = changePasswordFormSchema.safeParse(values);
  if (result.success) {
    const { currentPassword, newPassword } = result.data;
    return { ok: true, data: { currentPassword, newPassword } };
  }

  const { fieldErrors } = z.flattenError(result.error);
  return {
    ok: false,
    errors: {
      currentPassword: fieldErrors.currentPassword?.[0],
      newPassword: fieldErrors.newPassword?.[0],
      confirmPassword: fieldErrors.confirmPassword?.[0],
    },
  };
}
