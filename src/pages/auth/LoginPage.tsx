import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { PasswordField } from '@/components/molecules/PasswordField';
import { AuthLayout } from '@/components/templates/AuthLayout';
import { useCurrentUser, useLogin } from '@/features/auth/hooks';
import { validateLoginForm, type LoginFormErrors } from '@/schemas/loginForm';

/**
 * Sign-in screen. The form is checked here first; then features/auth sends it to the API.
 * When the server accepts it, the signed-in user is saved and we are redirected to the dashboard.
 */
export function LoginPage() {
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const { data: user } = useCurrentUser();
  const login = useLogin();

  // Already signed in (or just signed in): go to the app.
  if (user) {
    return <Navigate to="/" replace />;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateLoginForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    login.mutate(result.data);
  }

  return (
    <AuthLayout title="TriFid Admin" subtitle="Staff sign in.">
      {/* noValidate: we show our own messages instead of the browser's pop-ups. */}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {login.isError && (
          <div
            role="alert"
            className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {login.error.message}
          </div>
        )}

        <FormField label="Email" required error={errors.email}>
          {(field) => (
            <Input
              {...field}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={(event) =>
                setValues((current) => ({ ...current, email: event.target.value }))
              }
            />
          )}
        </FormField>

        <FormField label="Password" required error={errors.password}>
          {(field) => (
            <PasswordField
              {...field}
              name="password"
              autoComplete="current-password"
              required
              value={values.password}
              onChange={(event) =>
                setValues((current) => ({ ...current, password: event.target.value }))
              }
            />
          )}
        </FormField>

        <Button type="submit" className="mt-2 w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
