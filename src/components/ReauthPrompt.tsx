import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiLock } from 'react-icons/fi';
import { reauth } from '../api/identity';
import { ApiError } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

/**
 * CH §24.2 — re-authentication immediately before a money-moving action
 * (releasing a payment run, reposting a bank entry). Asks for the password
 * again, gets a short-lived reauth token, and hands it to `onReauthed` —
 * the caller is responsible for sending it as `X-Reauth-Token` on the
 * actual money-moving call, which must happen while the token is still
 * fresh (5 minutes).
 */
export function ReauthPrompt({ onReauthed }: { onReauthed: (reauthToken: string) => void }) {
  const { callApi } = useAuth();
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await callApi((token) => reauth(token, password, mfaCode || undefined));
      onReauthed(result.reauthToken);
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not re-authenticate.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-sm flex-col gap-3 rounded-md border border-warning-500/30 bg-warning-50 p-4"
    >
      <p className="text-sm text-warning-600">
        Confirm your password to continue — this is a money-moving action (CH §24.2).
      </p>
      <Input
        id="reauth-password"
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Input
        id="reauth-mfa"
        label="Authenticator code (if enrolled)"
        inputMode="numeric"
        maxLength={6}
        value={mfaCode}
        onChange={(e) => setMfaCode(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <Button type="submit" loading={submitting} disabled={!password} icon={<FiLock />}>
        Confirm
      </Button>
    </form>
  );
}
