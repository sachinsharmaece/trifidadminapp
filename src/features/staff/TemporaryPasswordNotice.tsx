import { useState } from 'react';
import { Button } from '@/components/atoms/Button';

interface TemporaryPasswordNoticeProps {
  name: string;
  password: string;
  onDismiss: () => void;
}

/** Shows a temporary password once, right after an account is created or reset. It cannot be shown again. */
export function TemporaryPasswordNotice({
  name,
  password,
  onDismiss,
}: TemporaryPasswordNoticeProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  }

  return (
    <section
      role="status"
      className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p>
        Temporary password for <strong>{name}</strong>. It is shown only once, so give it to them
        privately now. They must choose their own password the first time they sign in.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-mono text-base text-slate-900">
          {password}
        </code>
        <Button variant="secondary" size="sm" onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          I have noted it
        </Button>
      </div>
    </section>
  );
}
