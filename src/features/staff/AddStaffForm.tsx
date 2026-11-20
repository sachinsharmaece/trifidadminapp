import { useState, type FormEvent } from 'react';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { useCurrentUser } from '@/features/auth/hooks';
import { validateStaffForm, type StaffFormErrors } from '@/schemas/staffForm';
import { ROLES, ROLE_LABELS } from '@/types/roles';
import { useCreateStaff } from './hooks';

interface AddStaffFormProps {
  /** Called with the new person's name and the temporary password the server made up. */
  onCreated: (name: string, temporaryPassword: string) => void;
  onCancel: () => void;
}

export function AddStaffForm({ onCreated, onCancel }: AddStaffFormProps) {
  const { data: me } = useCurrentUser();
  const create = useCreateStaff();
  const [values, setValues] = useState({ name: '', email: '', role: 'SALES' });
  const [errors, setErrors] = useState<StaffFormErrors>({});

  // Only a Founder can create another Founder (the server enforces it too).
  const roles = ROLES.filter((role) => role !== 'FOUNDER' || me?.role === 'FOUNDER');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateStaffForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    create.mutate(result.data, {
      onSuccess: (created) => onCreated(created.user.name, created.temporaryPassword),
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold">Add a staff member</h2>

      {create.isError && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {create.error.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Name" required error={errors.name}>
          {(field) => (
            <Input
              {...field}
              name="name"
              required
              value={values.name}
              onChange={(event) =>
                setValues((current) => ({ ...current, name: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="Email" required error={errors.email}>
          {(field) => (
            <Input
              {...field}
              type="email"
              name="email"
              required
              value={values.email}
              onChange={(event) =>
                setValues((current) => ({ ...current, email: event.target.value }))
              }
            />
          )}
        </FormField>
        <FormField label="Role" required error={errors.role}>
          {(field) => (
            <Select
              {...field}
              name="role"
              value={values.role}
              onChange={(event) =>
                setValues((current) => ({ ...current, role: event.target.value }))
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <div className="flex gap-2">
        <Button type="submit" loading={create.isPending}>
          Create account
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
