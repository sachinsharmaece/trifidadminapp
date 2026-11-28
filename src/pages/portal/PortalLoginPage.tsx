import { OtpLoginForm } from '@/components/ref/portal/OtpLoginForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** /portal/buyer/login and /portal/seller/login (reference app/portal/<side>/login). */
export function PortalLoginPage({ partyType }: { partyType: 'BUYER' | 'SELLER' }) {
  const title = partyType === 'BUYER' ? 'TriFid — Buyer Portal' : 'TriFid — Seller Portal';
  useDocumentTitle(title);
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-zinc-900">{title}</h1>
        <p className="mb-6 text-sm text-zinc-500">Sign in with your registered mobile number.</p>
        <OtpLoginForm
          partyType={partyType}
          dashboardPath={
            partyType === 'BUYER' ? '/portal/buyer/dashboard' : '/portal/seller/dashboard'
          }
        />
      </div>
    </div>
  );
}
