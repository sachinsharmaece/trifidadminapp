import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEye } from 'react-icons/fi';
import { getSupplyMatrixBySeller, type SupplyMatrixSellerRow } from '../../api/purchase';
import { listRegistrations } from '../../api/onboarding';
import type { RegistrationListItem } from '../../api/dto';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

export function SellersPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();

  const pendingLoader = useCallback(
    () => callApi((token) => listRegistrations(token, 'pending')),
    [callApi],
  );
  const pending = useAsyncData(
    pendingLoader,
    (items) => items.filter((r) => r.kind !== 'buyer').length === 0,
    [pendingLoader],
  );

  const panelLoader = useCallback(
    () => callApi((token) => getSupplyMatrixBySeller(token)),
    [callApi],
  );
  const panel = useAsyncData(panelLoader, (items) => items.length === 0, [panelLoader]);

  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_sellers" />
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          The panel is the asset — a seller never onboarded, never given an area, or never asked
          what he carries is behind almost every gap on Demand.
        </p>
        <Button icon={<FiPlus />} onClick={() => navigate('/purchase/add-seller')}>
          Add a seller
        </Button>
      </div>

      <Card title="Waiting on us">
        <p className="mb-4 text-sm text-slate-500">
          No area, no listing (BR-083/BR-082). Setting the area is done from Registrations.
        </p>
        <AsyncBoundary
          state={pending.state}
          onRetry={pending.retry}
          emptyMessage="Nothing waiting."
        >
          {(items: RegistrationListItem[]) => {
            const sellers = items.filter((r) => r.kind !== 'buyer');
            return sellers.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing waiting.</p>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Firm</Th>
                    <Th>GSTIN</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {sellers.map((r) => (
                    <tr key={r.registrationId}>
                      <Td className="font-medium">{r.firm ?? '—'}</Td>
                      <Td className="font-mono text-xs">{r.gstin ?? '—'}</Td>
                      <Td>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate('/registrations')}
                        >
                          Set area
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            );
          }}
        </AsyncBoundary>
      </Card>

      <Card title="On the panel">
        <AsyncBoundary state={panel.state} onRetry={panel.retry} emptyMessage="No sellers yet.">
          {(items: SupplyMatrixSellerRow[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Firm</Th>
                  <Th>Tier</Th>
                  <Th>Carries</Th>
                  <Th>Listed</Th>
                  <Th>Companies</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.sellerId}>
                    <Td className="font-medium">{s.firm}</Td>
                    <Td>
                      <Badge tone="neutral">{s.trustTier}</Badge>
                    </Td>
                    <Td>
                      {s.carryCount ? s.carryCount : <span className="text-danger-500">0</span>}
                    </Td>
                    <Td>
                      {s.listedCount ? (
                        s.listedCount
                      ) : s.carryCount ? (
                        <span className="text-warning-600">0</span>
                      ) : (
                        '—'
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {s.manufacturerNames.join(', ') || '—'}
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<FiEye />}
                        onClick={() => navigate(`/purchase/sellers/${s.sellerId}`)}
                      >
                        Open
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>
    </div>
  );
}
