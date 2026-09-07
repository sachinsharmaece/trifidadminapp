import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ApiError } from '../api/errors';

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
      <main className="auth-page">
        <h1>Enter your authenticator code</h1>
        <form onSubmit={handleMfaSubmit}>
          <label htmlFor="mfa-code">6-digit code</label>
          <input
            id="mfa-code"
            inputMode="numeric"
            maxLength={6}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={submitting || code.length !== 6}>
            {submitting ? 'Checking…' : 'Verify'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <h1>Sign in</h1>
      <form onSubmit={handleCredentialsSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting || !email || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
