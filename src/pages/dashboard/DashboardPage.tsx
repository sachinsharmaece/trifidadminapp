import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import { DashboardView } from '@/features/reports/DashboardView';
import { useDashboard } from '@/features/reports/hooks';
import { env } from '@/lib/env';
import { ApiError } from '@/services/api/ApiError';
import { fetchReadiness } from '@/services/api/system';

/** What to check next, based on how the call failed. */
function connectionHint(error: Error): string {
  // No answer at all while calling the API directly from another origin: if the server is running,
  // the browser most likely blocked the answer (CORS) because this page's origin is not allowed.
  if (error instanceof ApiError && error.code === 'NETWORK_ERROR' && env.isApiCrossOrigin()) {
    const origin = window.location.origin;
    return `This page (${origin}) called ${env.apiBaseUrl} directly. If trifidserverapp is running, the browser most likely blocked the answer (CORS): add ${origin} to CORS_ORIGIN in trifidserverapp's .env, or set VITE_API_BASE_URL=/api/v1 so requests go through Vite's proxy.`;
  }
  return 'Is trifidserverapp running on the port set in VITE_DEV_PROXY_TARGET?';
}

/**
 * The home page: the numbers for the signed-in role (SRS-RPT-05), then, for Founder and Admin, the "API status" card
 * that proves the wiring end to end: TanStack Query -> Axios client -> Vite proxy -> trifidserverapp -> MongoDB.
 */
export function DashboardPage() {
  const { data: me } = useCurrentUser();
  const dashboard = useDashboard();
  const showApiStatus = me?.role === 'FOUNDER' || me?.role === 'ADMIN';

  return (
    <PageLayout
      title="Dashboard"
      description="Where things stand for your desk. Click a number to open the work."
    >
      {dashboard.isPending && (
        <Spinner label="Loading the dashboard" className="h-6 w-6 text-brand-600" />
      )}
      {dashboard.isError && (
        <ErrorState title="Could not load the dashboard" message={dashboard.error.message}>
          <Button onClick={() => void dashboard.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {dashboard.isSuccess && <DashboardView dashboard={dashboard.data} />}
      {showApiStatus && <ApiStatusCard />}
    </PageLayout>
  );
}

function ApiStatusCard() {
  const readiness = useQuery({
    queryKey: ['system', 'readiness'],
    queryFn: ({ signal }) => fetchReadiness(signal),
    staleTime: 0,
  });

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">API status</h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void readiness.refetch()}
          loading={readiness.isFetching}
        >
          Check again
        </Button>
      </div>

      <div className="mt-4 text-sm">
        {readiness.isPending && (
          <Spinner label="Checking the API" className="h-5 w-5 text-brand-600" />
        )}

        {readiness.isError && (
          <p className="text-red-700">
            Cannot reach the API: {readiness.error.message} {connectionHint(readiness.error)}
          </p>
        )}

        {readiness.isSuccess && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt className="text-slate-500">Server</dt>
            <dd>
              <Badge tone={readiness.data.status === 'ready' ? 'success' : 'warning'}>
                {readiness.data.status}
              </Badge>
            </dd>
            <dt className="text-slate-500">Database</dt>
            <dd>
              <Badge tone={readiness.data.checks.database === 'up' ? 'success' : 'danger'}>
                {readiness.data.checks.database}
              </Badge>
            </dd>
          </dl>
        )}
      </div>
    </section>
  );
}
