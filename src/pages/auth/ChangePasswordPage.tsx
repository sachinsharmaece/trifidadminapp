import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button, buttonStyles } from '@/components/atoms/Button';
import { FormField } from '@/components/molecules/FormField';
import { PasswordField } from '@/components/molecules/PasswordField';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { useChangePassword, useCurrentUser, useLogout } from '@/features/auth/hooks';
import {
  validateChangePasswordForm,
  type ChangePasswordFormErrors,
} from '@/schemas/changePasswordForm';

/**
 * Choose a new password. Two ways in:
 *  - forced: the person is on a temporary password (new account or reset) and cannot use the app until they change it;
 *  - voluntary: "Change password" in the header.
 */
export function ChangePasswordPage() {
  const { data: user } = useCurrentUser();
  const forced = user?.mustChangePassword ?? false;
  const navigate = useNavigate();
  const changePassword = useChangePassword();
  const logout = useLogout();

  const [values, setValues] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateChangePasswordForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    changePassword.mutate(result.data, { onSuccess: () => void navigate('/', { replace: true }) });
  }

  function field(name: keyof typeof values) {
    return {
      name,
      required: true,
      value: values[name],
      onChange: (event: { target: { value: string } }) =>
        setValues((current) => ({ ...current, [name]: event.target.value })),
    };
  }

  return (
    <AuthLayout
      title="Change password"
      subtitle={
        forced
          ? 'You are using a temporary password. Choose your own to continue.'
          : 'Use at least 10 characters.'
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {changePassword.isError && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {changePassword.error.message}
          </div>
        )}

        <FormField
          label={forced ? 'Temporary password' : 'Current password'}
          required
          error={errors.currentPassword}
        >
          {(props) => (
            <PasswordField
              {...props}
              {...field('currentPassword')}
              autoComplete="current-password"
            />
          )}
        </FormField>
        <FormField label="New password" required error={errors.newPassword}>
          {(props) => (
            <PasswordField {...props} {...field('newPassword')} autoComplete="new-password" />
          )}
        </FormField>
        <FormField label="Repeat new password" required error={errors.confirmPassword}>
          {(props) => (
            <PasswordField {...props} {...field('confirmPassword')} autoComplete="new-password" />
          )}
        </FormField>

        <Button type="submit" className="w-full" loading={changePassword.isPending}>
          Change password
        </Button>

        {forced ? (
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => logout.mutate()}
            loading={logout.isPending}
          >
            Sign out
          </Button>
        ) : (
          <Link to="/" className={buttonStyles({ variant: 'ghost', className: 'w-full' })}>
            Cancel
          </Link>
        )}
      </form>
    </AuthLayout>
  );
}
