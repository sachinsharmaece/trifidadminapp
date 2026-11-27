import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Sales → Today, as the reference (app/(sales)/today). The reference fills it with the dormant-policy clocks
 * (build R8, only when that policy is on) and, for a TM, the credit requests to approve (build R7).
 */
export function SalesTodayPage() {
  useDocumentTitle('Today');
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Today</h1>
    </div>
  );
}
