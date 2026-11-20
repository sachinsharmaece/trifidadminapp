import { z } from 'zod';
import { ROLES, type Role } from '@/types/roles';

/** UI-only validation for the "Add staff" form: friendly messages and a trimmed name and email. */
const staffFormSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(100, 'Use at most 100 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter an email address')
    .pipe(z.email('Enter a valid email address')),
  role: z.enum(ROLES, 'Choose a role'),
});

export type StaffFormValues = { name: string; email: string; role: string };
export type StaffFormErrors = Partial<Record<keyof StaffFormValues, string>>;

export type StaffFormResult =
  | { ok: true; data: { name: string; email: string; role: Role } }
  | { ok: false; errors: StaffFormErrors };

export function validateStaffForm(values: StaffFormValues): StaffFormResult {
  const result = staffFormSchema.safeParse(values);
  if (result.success) {
    return { ok: true, data: result.data };
  }

  const { fieldErrors } = z.flattenError(result.error);
  return {
    ok: false,
    errors: {
      name: fieldErrors.name?.[0],
      email: fieldErrors.email?.[0],
      role: fieldErrors.role?.[0],
    },
  };
}
