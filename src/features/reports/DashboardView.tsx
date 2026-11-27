import { Link } from 'react-router';
import type { Dashboard, DashboardTile } from '@/features/reports/api';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRupees } from '@/utils/format';

/** The page each funnel opens, by the title the server gives it. */
const FUNNEL_PAGE: Record<string, string> = {
  'Buyer side': '/buyer-funnels',
  'Seller side': '/seller-funnels',
};

/**
 * Where a tile leads, so a number is one click from the work behind it. Only pages the role can open: Sales and
 * Purchase have no Today page, so their "overdue" tile opens their own funnels.
 */
function tileLink(tile: DashboardTile, role: Dashboard['role']): string | null {
  const byKey: Record<string, string> = {
    awaitingPayment: '/sales-orders',
    pastPaymentTime: '/sales-orders',
    toDispatch: '/purchase-orders',
    dispatchLate: '/purchase-orders',
    paymentsToConfirm: '/payments',
    advancesUnused: '/payments',
    journalsToApprove: '/journals',
    banksToReconcile: '/bank-reconciliation',
    toBeBilled: '/to-be-billed',
    payablePos: '/payouts',
    refundsDue: '/payouts',
    heldPayouts: '/payouts',
    inboundExpected: '/dock',
    inboundLate: '/dock',
    atDock: '/dock',
    checkLate: '/dock',
    dispatchQueue: '/trips',
    onTheRoad: '/trips',
    slaBreaches: '/today',
    openComplaints: '/complaints',
    integrity: '/integrity',
  };
  if (tile.key === 'overdueDesk') {
    if (role === 'SALES') return '/buyer-funnels';
    if (role === 'PURCHASE') return '/seller-funnels';
    return '/today';
  }
  return byKey[tile.key] ?? null;
}

const TONE_CLASSES: Record<DashboardTile['tone'], string> = {
  normal: 'border-slate-200 bg-white',
  warn: 'border-amber-300 bg-amber-50',
  bad: 'border-red-300 bg-red-50',
};

function Tile({ tile, role }: { tile: DashboardTile; role: Dashboard['role'] }) {
  const link = tileLink(tile, role);
  const body = (
    <>
      <p className="text-sm text-slate-600">{tile.label}</p>
      <p className="mt-1 text-2xl font-semibold">
        {tile.kind === 'money' ? formatRupees(tile.value) : tile.value}
      </p>
      {tile.hint && <p className="mt-1 text-xs text-slate-500">{tile.hint}</p>}
    </>
  );
  const classes = cn('block rounded-lg border p-4', TONE_CLASSES[tile.tone]);
  return link ? (
    <Link to={link} className={cn(classes, 'hover:border-brand-500')}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/**
 * The numbers for one role (server: modules/reports/dashboard.ts). The server decides what each role may see, so this
 * only draws what came back: Sales never gets a seller figure, and margin reaches only Controller, Founder and Admin.
 */
export function DashboardView({ dashboard }: { dashboard: Dashboard }) {
  return (
    <div className="space-y-6">
      <section aria-label="Numbers" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {dashboard.tiles.map((tile) => (
          <Tile key={tile.key} tile={tile} role={dashboard.role} />
        ))}
      </section>

      {dashboard.funnels.map((funnel) => (
        <section key={funnel.title} aria-label={`${funnel.title} funnel`} className="space-y-2">
          <h2 className="text-lg font-semibold">
            {FUNNEL_PAGE[funnel.title] ? (
              <Link to={FUNNEL_PAGE[funnel.title] ?? '/'} className="hover:underline">
                {funnel.title}
              </Link>
            ) : (
              funnel.title
            )}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {funnel.rows.map((row) => (
              <li
                key={row.stage}
                className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <span className="font-semibold">{row.count}</span>{' '}
                <span className="text-slate-600">{row.label}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {dashboard.leakage && (
        <section aria-label="Lost deals this month" className="space-y-2">
          <h2 className="text-lg font-semibold">Deals lost this month</h2>
          {dashboard.leakage.length === 0 ? (
            <p className="text-sm text-slate-600">No deal has been lost this month.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white text-sm">
              {dashboard.leakage.map((item) => (
                <li key={item.label} className="flex justify-between gap-3 px-4 py-2">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="text-xs text-slate-500">
        Worked out at {formatDateTime(dashboard.generatedAt)}. The numbers refresh whenever a deal
        card changes.
      </p>
    </div>
  );
}
