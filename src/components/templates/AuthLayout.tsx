import type { ReactNode } from 'react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/** The reference's sign-in card: a white box in the middle of a zinc page (app/login/page.tsx). */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  useDocumentTitle(title);

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-zinc-500">{subtitle}</p>}
        {children}
      </div>
    </main>
  );
}
