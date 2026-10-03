import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { createModel } from './model';
import type { Model } from './model';
import type { AccountsSnapshot } from './types';

interface AccountsContextValue {
  /** Every derivation the screens share, built once per snapshot. */
  m: Model;
  can: (permission: string) => boolean;
  employeeId: string;
  /** Refetch the snapshot without blanking the screen. */
  reload: () => Promise<void>;
  /** The template's toast. Errors stay up longer than confirmations. */
  say: (message: string, opts?: { error?: boolean }) => void;
  toast: { message: string } | null;
  /**
   * Runs one API call as the signed-in person. On success: toast, refetch.
   * On failure: the server's own sentence in the toast. Resolves to whether it worked.
   */
  run: (call: (token: string) => Promise<unknown>, done: string) => Promise<boolean>;
  /** Navigate to a path under /accounts ('' is Today). */
  go: (path: string) => void;
  /** Picked for the next batch: "payout:<poKey>" or "refund:<refundKey>". */
  batch: string[];
  toggleBatch: (token: string) => void;
  clearBatch: () => void;
  /** The bank statement's closing balance, typed on Day close, in rupees. */
  statement: string;
  setStatement: (value: string) => void;
}

const Ctx = createContext<AccountsContextValue | null>(null);

export function AccountsProvider({
  snapshot,
  reload,
  children,
}: {
  snapshot: AccountsSnapshot;
  reload: () => Promise<void>;
  children: ReactNode;
}) {
  const { callApi, me, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [toast, setToast] = useState<{ message: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [batch, setBatch] = useState<string[]>([]);
  const [statement, setStatement] = useState('');

  const m = useMemo(() => createModel(snapshot), [snapshot]);

  const say = useCallback((message: string, opts?: { error?: boolean }) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message });
    timer.current = setTimeout(() => setToast(null), opts?.error ? 6000 : 2400);
  }, []);

  const run = useCallback<AccountsContextValue['run']>(
    async (call, done) => {
      try {
        await callApi(call);
        say(done);
        await reload();
        return true;
      } catch (error) {
        say(error instanceof ApiError ? error.message : 'Could not do that. Try again.', {
          error: true,
        });
        return false;
      }
    },
    [callApi, reload, say],
  );

  const value: AccountsContextValue = {
    m,
    can: hasPermission,
    employeeId: me?.employeeId ?? '',
    reload,
    say,
    toast,
    run,
    go: (path) => navigate(path ? `/accounts/${path}` : '/accounts'),
    batch,
    toggleBatch: (token) =>
      setBatch((current) =>
        current.includes(token) ? current.filter((t) => t !== token) : [...current, token],
      ),
    clearBatch: () => setBatch([]),
    statement,
    setStatement,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccounts(): AccountsContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAccounts must be used within <AccountsProvider>');
  return ctx;
}
