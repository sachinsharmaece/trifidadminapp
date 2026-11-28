import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { refSend } from '@/lib/refApi';

/** Mobile number → code → sign in, for both portals (reference components/portal/OtpLoginForm). */
export function OtpLoginForm({
  partyType,
  dashboardPath,
}: {
  partyType: 'BUYER' | 'SELLER';
  dashboardPath: string;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await refSend<{ message: string }>('POST', '/portal/otp/request', {
        partyType,
        mobile,
      });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setMessage(res.data.message);
      setStep('otp');
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await refSend('POST', '/portal/otp/verify', { partyType, mobile, otp });
      if (!res.ok) {
        setError(res.message);
        return;
      }
      void navigate(dashboardPath);
    } finally {
      setLoading(false);
    }
  }

  if (step === 'mobile') {
    return (
      <form onSubmit={(e) => void requestCode(e)} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Mobile number
          <input
            type="tel"
            inputMode="numeric"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            required
            autoComplete="tel"
            placeholder="10-digit mobile number"
            className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-base focus:border-zinc-500 focus:outline-none sm:text-sm"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          Send code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => void verifyCode(e)} className="flex flex-col gap-4">
      {message && <p className="text-sm text-zinc-600">{message}</p>}
      <label className="flex flex-col gap-1 text-sm text-zinc-700">
        Enter the 6-digit code
        <input
          type="text"
          inputMode="numeric"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          autoComplete="one-time-code"
          className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-base tracking-widest focus:border-zinc-500 focus:outline-none sm:text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 min-h-11 rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        Verify and sign in
      </button>
      <button
        type="button"
        onClick={() => {
          setStep('mobile');
          setOtp('');
          setError(null);
        }}
        className="text-xs text-zinc-500 underline"
      >
        Use a different mobile number
      </button>
    </form>
  );
}
