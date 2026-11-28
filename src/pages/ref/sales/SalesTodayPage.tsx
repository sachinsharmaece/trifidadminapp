import { ClocksGroup } from '@/components/ref/dormancy/ClocksGroup';
import { CreditRequestsForTM } from '@/components/ref/credit/CreditRequestsForTM';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Sales → Today, as the reference (app/(sales)/today): the dormant-policy Clocks (only for a caller or the Team
 * Leader, with the policy on), then for a TM the credit requests from his team to approve.
 */
export function SalesTodayPage() {
  useDocumentTitle('Today');
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Today</h1>
      <ClocksGroup />
      <CreditRequestsForTM />
    </div>
  );
}
