import { useCallback, useEffect } from 'react';
import { getPilesConfirmedNotCompleted } from '../../api/purchase';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';
import { timeAgo } from '../../lib/timeAgo';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Table, Td, Th } from '../../components/ui/Table';

const REFRESH_MS = 60_000;

/**
 * BR-137 / BR-378 — a pile the seller confirmed whose deal-giving step has not gone through. It
 * used to drop off every queue the moment it was confirmed; this keeps it in sight until the buyers
 * have their deals. The server retries it on its own; Purchase is told once if it keeps failing.
 *
 * Quiet unless something is stuck, and it never blocks the page it sits on: a failed load shows
 * nothing. Buyers appear as a count only (BR-365).
 */
export function StuckConfirmationsSection() {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getPilesConfirmedNotCompleted(token)),
    [callApi],
  );
  const { state, refresh } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  // The retry can clear it at any time; keep the list honest while the page is open.
  useEffect(() => {
    const timer = window.setInterval(refresh, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (state.status !== 'success') return null;

  return (
    <Card title="Confirmed, but the buyers have not been given their deal">
      <p className="mb-4 text-sm text-slate-500">
        The seller confirmed these, but the step that gives each buyer their deal has not gone
        through. It is retried every 5 minutes for 24 hours. After that it is not retried, and it
        needs a decision.
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Seller · Product</Th>
            <Th numeric>Boxes</Th>
            <Th numeric>Buyers</Th>
            <Th>Confirmed</Th>
            <Th>Status</Th>
            <Th>Last error</Th>
          </tr>
        </thead>
        <tbody>
          {state.data.map((item) => (
            <tr key={item.pileId}>
              <Td>
                <span className="font-medium">{item.sellerFirm}</span>
                <span className="text-slate-500">
                  {' '}
                  · {item.brand} {item.packLabel}
                </span>
              </Td>
              <Td numeric>{item.boxes}</Td>
              <Td numeric>{item.buyers}</Td>
              <Td>{timeAgo(item.confirmedAt)}</Td>
              <Td>
                {item.retrying ? (
                  <Badge tone="warn">Retrying</Badge>
                ) : (
                  <Badge tone="bad">Needs a decision</Badge>
                )}
              </Td>
              <Td className="text-slate-500">{item.lastError ?? '—'}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
