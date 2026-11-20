import type { ReactNode } from 'react';
import logoUrl from '@/assets/logo.svg';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** Centered card on a plain background, for pages shown before sign-in (login, and later password reset). */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  useDocumentTitle(title);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={logoUrl} alt="TriFid" className="h-12 w-12" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  );
}
