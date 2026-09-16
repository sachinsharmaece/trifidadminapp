import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/errors';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { DevNote } from '../components/dev/DevNote';

type Step = 'credentials' | 'mfa';

// CH §24.1 / API_CONTRACT.md §2 — every error state the login and MFA
// endpoints can return, in plain English for a staff user.
function describeLoginError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'INVALID_CREDENTIALS':
        return 'Incorrect email or password.';
      case 'ACCOUNT_NOT_ACTIVE':
        return 'This account is not active. Contact an Admin.';
      case 'LOCKED_OUT':
        return 'Too many attempts. Try again later.';
      case 'OTP_INVALID':
        return 'That code is not right.';
      case 'REAUTH_REQUIRED':
        return 'That challenge has expired. Sign in again.';
      case 'NETWORK_ERROR':
        return 'Could not reach the server. Check your connection and try again.';
      case 'VALIDATION_FAILED':
        return error.message;
      default:
        return 'Something went wrong. Please try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}

export function LoginPage() {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCredentialsSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.mfaRequired && result.mfaToken) {
        setMfaToken(result.mfaToken);
        setStep('mfa');
      } else {
        navigate('/');
      }
    } catch (submitError) {
      setError(describeLoginError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMfaSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!mfaToken) return;
    setError(null);
    setSubmitting(true);
    try {
      await verifyMfa(mfaToken, code);
      navigate('/');
    } catch (submitError) {
      setError(describeLoginError(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 'mfa') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-sm">
          <h1 className="mb-4 text-lg font-semibold text-slate-900">
            Enter your authenticator code
          </h1>
          <form onSubmit={handleMfaSubmit} className="flex flex-col gap-4">
            <Input
              id="mfa-code"
              label="6-digit code"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              error={error ?? undefined}
            />
            <Button type="submit" loading={submitting} disabled={code.length !== 6}>
              Verify
            </Button>
          </form>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h1>
        <DevNote screen="admin_login" />
        <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={error ?? undefined}
          />
          <Button type="submit" loading={submitting} disabled={!email || !password}>
            Sign in
          </Button>
        </form>
      </Card>
    </main>
  );
}
