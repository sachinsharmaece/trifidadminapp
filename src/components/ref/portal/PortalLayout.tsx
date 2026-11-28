import { useState } from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet, refSend } from '@/lib/refApi';

/**
 * The frame of a portal dashboard (reference app/portal/<side>/dashboard/layout.tsx + PortalHeader + the
 * proxy.ts check): signed in to the right portal, or sent to its login page. Staff sign-in plays no part here.
 */
export function PortalLayout({
  partyType,
  title,
  loginPath,
}: {
  partyType: 'BUYER' | 'SELLER';
  title: string;
  loginPath: string;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<'checking' | 'in' | 'out'>('checking');

  useOnMount(async () => {
    const me = await refGet<{ party: { partyType: string } }>('/portal/me').catch(() => null);
    setState(me?.party.partyType === partyType ? 'in' : 'out');
  });

  async function signOut() {
    await refSend('POST', '/portal/logout');
    void navigate(loginPath);
  }

  if (state === 'checking') return <div className="p-8 text-sm text-zinc-400">Loading…</div>;
  if (state === 'out') return <Navigate to={loginPath} replace />;
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <h1 className="text-sm font-semibold text-zinc-900">{title}</h1>
        <button
          type="button"
          onClick={() => void signOut()}
          className="min-h-11 rounded border border-zinc-300 px-3 text-xs text-zinc-600 hover:bg-zinc-50"
        >
          Sign out
        </button>
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
