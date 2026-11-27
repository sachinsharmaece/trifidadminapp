import { EventLogTable } from '@/components/ref/credit/EventLogTable';
import { ExposureSummaries } from '@/components/ref/credit/ExposureSummaries';
import { useCurrentUser } from '@/features/auth/hooks';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/**
 * Credit log, as the reference (app/(accounts)/credit-log): the permanent credit (and listing) event log; the
 * Controller (and Founder, Admin) also see exposure by executive and by reference on top.
 */
export function CreditLogPage() {
  useDocumentTitle('Credit log');
  const { data: me } = useCurrentUser();
  const canSeeExposure = ['ADMIN', 'CONTROLLER', 'FOUNDER'].includes(me?.role ?? '');
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Credit log</h1>
      {canSeeExposure && (
        <div className="mb-6">
          <ExposureSummaries />
        </div>
      )}
      <EventLogTable />
    </div>
  );
}
