import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiPlus, FiEye } from 'react-icons/fi';
import { getSupplyMatrixBySeller, type SupplyMatrixSellerRow } from '../../api/purchase';
import { listRegistrationsPage } from '../../api/onboarding';
import { useDebounced, usePagedList } from '../../lib/usePagedList';
import { useListParams } from '../../lib/useListParams';
import { ListFooter } from '../../components/ListFooter';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import type { RegistrationListItem } from '../../api/dto';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { LeadLookup } from '../../components/lead/LeadLookup';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { DevNote } from '../../components/dev/DevNote';

export function SellersPage() {
  const { callApi } = useAuth();
  const navigate = useNavigate();

  // 29 Oct — sellers only, from the server, a page at a time: the old call took
  // the first 25 pending registrations of every kind, so a seller behind 25
  // buyers never showed.
  const loadPending = useCallback(
    (cursor?: string) =>
      callApi((token) =>
        listRegistrationsPage(token, { stage: 'pending', kind: 'seller', cursor, limit: 25 }),
      ),
    [callApi],
  );
  const pending = usePagedList<RegistrationListItem>(loadPending);

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

      <Card title="Already on TriFid?">
        <LeadLookup side="seller" fileHref={(id) => `/purchase/sellers/${id}`} />
      </Card>

      <Card title="Waiting on us">
        <p className="mb-4 text-sm text-slate-500">
          No area, no listing (BR-083/BR-082). Setting the area is done from Registrations.
        </p>
        {pending.status === 'loading' && <Loader />}
        {pending.status === 'error' && (
          <ErrorState
            message={pending.error ?? 'Could not load.'}
            onRetry={() => void pending.reload()}
          />
        )}
        {pending.status === 'ready' &&
          (pending.items.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing waiting.</p>
          ) : (
            <>
              <Table>
                <thead>
                  <tr>
                    <Th>Firm</Th>
                    <Th>GSTIN</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {pending.items.map((r) => (
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
              <ListFooter
                shown={pending.items.length}
                total={pending.total}
                hasMore={pending.hasMore}
                loading={pending.loadingMore}
                error={pending.error}
                onMore={() => void pending.loadMore()}
              />
            </>
          ))}
      </Card>

      <Card title="On the panel">
        <AsyncBoundary state={panel.state} onRetry={panel.retry} emptyMessage="No sellers yet.">
          {(items: SupplyMatrixSellerRow[]) => <PanelTable items={items} />}
        </AsyncBoundary>
      </Card>
    </div>
  );
}

/**
 * 3 Nov (My view sheet) — search and filters over the panel. The panel comes in whole, so they
 * work in the browser; they live in the URL, so opening a seller and pressing Back shows the same
 * list. The exact-GSTIN lookup above is a separate card and is left as it was.
 */
const SELLER_LIST_DEFAULTS = {
  q: '',
  district: '',
  assigned: '',
  tier: '',
  carries: '',
  listed: '',
} as const;

const QUEUE = 'queue';
const TIER_ORDER = ['New', 'Verified', 'Trusted', 'Committed'];

export interface SellerFilters {
  q: string;
  district: string;
  assigned: string;
  tier: string;
  carries: string;
  listed: string;
}

/** Search looks through firm, proprietor, mobile, GSTIN, district and companies. */
export function filterSellers(
  items: SupplyMatrixSellerRow[],
  filters: SellerFilters,
): SupplyMatrixSellerRow[] {
  const needle = filters.q.trim().toLowerCase();
  return items.filter((s) => {
    if (filters.district && s.district !== filters.district) return false;
    if (filters.assigned === QUEUE && s.assignedToEmployeeId) return false;
    if (
      filters.assigned &&
      filters.assigned !== QUEUE &&
      s.assignedToEmployeeId !== filters.assigned
    )
      return false;
    if (filters.tier && s.trustTier !== filters.tier) return false;
    if (filters.carries === 'has' && s.carryCount === 0) return false;
    if (filters.carries === 'none' && s.carryCount > 0) return false;
    if (filters.listed === 'yes' && s.listedCount === 0) return false;
    if (filters.listed === 'no' && s.listedCount > 0) return false;
    if (!needle) return true;
    return [s.firm, s.ownerName, s.mobile, s.gstin, s.district, ...s.manufacturerNames].some(
      (field) => field?.toLowerCase().includes(needle),
    );
  });
}

function PanelTable({ items }: { items: SupplyMatrixSellerRow[] }) {
  const navigate = useNavigate();
  const {
    values,
    set: setParams,
    reset,
    restoring,
  } = useListParams('purchaseSellers', SELLER_LIST_DEFAULTS);
  // The box keeps what is typed at once; the URL follows once typing settles.
  const [searchText, setSearchText] = useState(values.q);
  const q = useDebounced(searchText.trim());
  const settled = q === searchText.trim();
  useEffect(() => {
    if (settled && q !== values.q) setParams({ q });
  }, [settled, q, values.q, setParams]);

  const districts = useMemo(
    () => [...new Set(items.map((s) => s.district).filter((d): d is string => !!d))].sort(),
    [items],
  );
  const assignees = useMemo(() => {
    const byId = new Map<string, string>();
    for (const s of items) {
      if (s.assignedToEmployeeId) byId.set(s.assignedToEmployeeId, s.assignedTo ?? '—');
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [items]);
  const tiers = useMemo(() => {
    const rank = (tier: string): number => {
      const i = TIER_ORDER.indexOf(tier);
      return i === -1 ? TIER_ORDER.length : i;
    };
    return [...new Set(items.map((s) => s.trustTier))].sort(
      (a, b) => rank(a) - rank(b) || a.localeCompare(b),
    );
  }, [items]);

  const { district, assigned, tier, carries, listed } = values;
  const shown = useMemo(
    () => filterSellers(items, { q, district, assigned, tier, carries, listed }),
    [items, q, district, assigned, tier, carries, listed],
  );
  const filtering = Boolean(q || district || assigned || tier || carries || listed);
  if (restoring) return null;

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        placeholder="Firm, proprietor, mobile, GSTIN, district, company…"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      <div className="grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-5">
        <Select
          label="District"
          value={district}
          onChange={(e) => setParams({ district: e.target.value })}
        >
          <option value="">All</option>
          {districts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
        <Select
          label="Assigned to"
          value={assigned}
          onChange={(e) => setParams({ assigned: e.target.value })}
        >
          <option value="">Anyone</option>
          <option value={QUEUE}>Queue</option>
          {assignees.map(([employeeId, person]) => (
            <option key={employeeId} value={employeeId}>
              {person}
            </option>
          ))}
        </Select>
        <Select label="Tier" value={tier} onChange={(e) => setParams({ tier: e.target.value })}>
          <option value="">All</option>
          {tiers.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          label="Carries"
          value={carries}
          onChange={(e) => setParams({ carries: e.target.value })}
        >
          <option value="">All</option>
          <option value="has">Carries something</option>
          <option value="none">Carries nothing</option>
        </Select>
        <Select
          label="Listed"
          value={listed}
          onChange={(e) => setParams({ listed: e.target.value })}
        >
          <option value="">All</option>
          <option value="yes">Has a live listing</option>
          <option value="no">No live listing</option>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-sm text-slate-500" aria-live="polite">
          {filtering
            ? `${shown.length} of ${items.length} sellers`
            : `${items.length} ${items.length === 1 ? 'seller' : 'sellers'}`}
        </p>
        {filtering && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setSearchText('');
              reset();
            }}
          >
            Clear filters
          </Button>
        )}
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-slate-500">No seller matches these filters.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Firm</Th>
              <Th>District</Th>
              <Th>Assigned to</Th>
              <Th>Tier</Th>
              <Th numeric>Carries</Th>
              <Th numeric>Listed</Th>
              <Th>Companies</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {shown.map((s) => (
              <tr key={s.sellerId}>
                <Td className="font-medium">{s.firm}</Td>
                <Td>{s.district ?? '—'}</Td>
                <Td>{s.assignedTo ?? <Badge tone="warn">Queue</Badge>}</Td>
                <Td>
                  <Badge tone="neutral">{s.trustTier}</Badge>
                </Td>
                <Td numeric>
                  {s.carryCount ? s.carryCount : <span className="text-danger-500">0</span>}
                </Td>
                <Td numeric>
                  {s.listedCount ? (
                    s.listedCount
                  ) : s.carryCount ? (
                    <span className="text-warning-600">0</span>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="text-xs text-slate-500">{s.manufacturerNames.join(', ') || '—'}</Td>
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
    </div>
  );
}
