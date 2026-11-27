import { CreditRequestsForTM } from '@/components/ref/credit/CreditRequestsForTM';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Sales → Today, as the reference (app/(sales)/today). For a TM: the credit requests from his team to approve.
 * The dormant-policy clocks come with build R8 (only when that policy is on).
 */
export function SalesTodayPage() {
  useDocumentTitle('Today');
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Today</h1>
      <CreditRequestsForTM />
    </div>
  );
}
