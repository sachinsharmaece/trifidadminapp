import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { FiArrowDownLeft, FiArrowUpRight, FiUserPlus } from 'react-icons/fi';
import { listSalesBuyersPage, type BuyerListFacets, type BuyerListRow } from '../../api/sales';
import { listRegistrationsPage } from '../../api/onboarding';
import { useDebounced, usePagedList } from '../../lib/usePagedList';
import { ListFooter } from '../../components/ListFooter';
import { Loader } from '../../components/ui/Loader';
import { ErrorState } from '../../components/ui/ErrorState';
import { assignBook } from '../../api/admin';
import type { RegistrationListItem } from '../../api/dto';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { LeadLookup } from '../../components/lead/LeadLookup';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatDate } from '../../lib/dates';

type BookQueueTab = 'book' | 'queue';
type Tab = BookQueueTab | 'waiting';

/** Buyers — Book/Queue (live `/staff/sales/buyers`) plus a read-only Waiting tab onto Registrations. */
export function SalesBuyersPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('book');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Buyers</h1>
        <Button onClick={() => navigate('/sales/buyers/new')}>Register a buyer</Button>
      </div>

      <Card title="Already on TriFid?">
        <LeadLookup side="buyer" fileHref={(id) => `/sales/buyers/${id}`} />
      </Card>

      <div className="flex gap-2">
        <Button
          variant={tab === 'book' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('book')}
        >
          Book
        </Button>
        <Button
          variant={tab === 'queue' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('queue')}
        >
          Queue
        </Button>
        <Button
          variant={tab === 'waiting' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setTab('waiting')}
        >
          Waiting
        </Button>
      </div>

      {tab === 'waiting' ? (
        <WaitingTab />
      ) : (
        // B-53 — `BuyerListTab` stays mounted across a Book/Queue switch and
        // only reacts via `tab` in its `useAsyncData` deps; a fetch already
        // in flight for the old tab can still resolve after the switch and
        // overwrite the new tab's state with the old tab's data (or loading
        // state), with no further trigger to recover from it. Every other
        // tabbed screen in this codebase (e.g. SupplyMatrixPage) avoids this
        // by mounting a separate component per tab; `key` gets the same
        // effect here without duplicating the component.
        <BuyerListTab key={tab} tab={tab} />
      )}
    </div>
  );
}

function BuyerListTab({ tab }: { tab: BookQueueTab }) {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  // 29 Oct — searched, filtered and paged on the server (50 at a time; the
  // next page loads as you scroll, or "Load more"). It used to load every
  // buyer and filter in the browser.
  const [searchText, setSearchText] = useState('');
  const q = useDebounced(searchText.trim());
  const [filters, setFilters] = useState({ category: '', districtId: '', assignedTo: '' });
  const [assigning, setAssigning] = useState<{ buyerId: string; firm: string } | null>(null);
  const loadPage = useCallback(
    async (cursor?: string) => {
      const page = await callApi((token) =>
        listSalesBuyersPage(token, {
          tab,
          q: q || undefined,
          category: filters.category || undefined,
          districtId: filters.districtId || undefined,
          assignedTo: filters.assignedTo || undefined,
          cursor,
          limit: 50,
        }),
      );
      return { ...page, meta: { facets: page.facets } };
    },
    [callApi, tab, q, filters],
  );
  const list = usePagedList<BuyerListRow>(loadPage);
  // The options stay as first loaded for the tab, so picking one does not empty the others.
  const [facets, setFacets] = useState<BuyerListFacets | null>(null);
  useEffect(() => {
    const next = list.meta?.facets as BuyerListFacets | undefined;
    if (next) setFacets((current) => current ?? next);
  }, [list.meta]);
  const filtering = Boolean(q || filters.category || filters.districtId || filters.assignedTo);

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        placeholder="Firm, proprietor, mobile, GSTIN, PAN, tehsil…"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
      />
      <BuyerFilters facets={facets} tab={tab} value={filters} onChange={setFilters} />
      {list.status === 'loading' && <Loader />}
      {list.status === 'error' && (
        <ErrorState message={list.error ?? 'Could not load.'} onRetry={() => void list.reload()} />
      )}
      {list.status === 'ready' && list.items.length === 0 && (
        <p className="text-sm text-slate-500">
          {q ? (
            <>No match for &quot;{q}&quot;.</>
          ) : filtering ? (
            'No buyer matches these filters.'
          ) : (
            'Nobody here yet.'
          )}
        </p>
      )}
      {list.status === 'ready' && list.items.length > 0 && (
        <>
          <BuyerTable items={list.items} q="" navigate={navigate} onAssignToMe={setAssigning} />
          <ListFooter
            shown={list.items.length}
            total={list.total}
            hasMore={list.hasMore}
            loading={list.loadingMore}
            error={list.error}
            onMore={() => void list.loadMore()}
          />
        </>
      )}
      <AssignToBookModal
        target={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={() => {
          setAssigning(null);
          void list.reload();
        }}
      />
    </div>
  );
}

/**
 * B-10 — take a buyer from the Queue into your own book
 * (`POST /admin/book-assignments`). With the first-order auto-assign off
 * (DEC-062) this is how an unowned buyer is picked up; moving one someone
 * already owns is Change owner, for his leader or Admin (BR-362).
 */
function AssignToBookModal({
  target,
  onClose,
  onAssigned,
}: {
  target: { buyerId: string; firm: string } | null;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const { callApi, me } = useAuth();
  const [reason, setReason] = useState('');
  const save = useFormSubmit<unknown>({
    fields: ['reason'],
    success: `${target?.firm ?? 'He'} is now in your book.`,
    onSuccess: () => {
      setReason('');
      onAssigned();
    },
    toastOnSuccess: true,
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (!target || !me) return;
    void save.submit((key) =>
      callApi((token) =>
        assignBook(token, { buyerId: target.buyerId, ownerEmployeeId: me.employeeId, reason }, key),
      ),
    );
  }

  return (
    <Modal open={target !== null} title="Add to my book" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-slate-500">
          {target?.firm} moves from Queue into your book (BR-276). This is logged with your name and
          the reason below.
        </p>
        <Textarea
          id="ab-reason"
          label="Reason"
          hint="E.g. he has a real order and the automatic assignment never fired."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
        {save.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {save.formError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.submitting}>
            Add to my book
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const CATEGORIES = ['Retailer', 'Dealer', 'Distributor', 'Trader'];

function BuyerFilters({
  facets,
  tab,
  value,
  onChange,
}: {
  facets: BuyerListFacets | null;
  tab: BookQueueTab;
  value: { category: string; districtId: string; assignedTo: string };
  onChange: (next: { category: string; districtId: string; assignedTo: string }) => void;
}) {
  return (
    <div className="grid max-w-3xl grid-cols-3 gap-4">
      <Select
        label="Category"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}
      >
        <option value="">All</option>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </Select>
      <Select
        label="District"
        value={value.districtId}
        onChange={(e) => onChange({ ...value, districtId: e.target.value })}
      >
        <option value="">All</option>
        {(facets?.districts ?? []).map((d) => (
          <option key={d.districtId} value={d.districtId}>
            {d.name}
          </option>
        ))}
      </Select>
      {tab === 'book' && (
        <Select
          label="Assigned to"
          value={value.assignedTo}
          onChange={(e) => onChange({ ...value, assignedTo: e.target.value })}
        >
          <option value="">Anyone</option>
          {(facets?.assignees ?? []).map((a) => (
            <option key={a.employeeId} value={a.employeeId}>
              {a.person}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

function BuyerTable({
  items,
  q,
  navigate,
  onAssignToMe,
}: {
  items: BuyerListRow[];
  q: string;
  navigate: NavigateFunction;
  onAssignToMe: (target: { buyerId: string; firm: string }) => void;
}) {
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((b) =>
      [b.firm, b.contactName, b.mobile, b.gstin, b.pan, b.tehsil, b.district, b.ownerName].some(
        (field) => field?.toLowerCase().includes(needle),
      ),
    );
  }, [items, q]);

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        {q ? <>No match for &quot;{q}&quot;.</> : 'No buyer matches these filters.'}
      </p>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Firm</Th>
          <Th>Tehsil</Th>
          <Th>District</Th>
          <Th>Category</Th>
          <Th numeric>Orders</Th>
          <Th>Last order</Th>
          <Th numeric>Rate views</Th>
          <Th>Assigned to</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {filtered.map((b) => (
          <tr
            key={b.buyerId}
            className="cursor-pointer hover:bg-slate-50"
            onClick={() => navigate(`/sales/buyers/${b.buyerId}`)}
          >
            <Td>
              <div className="font-medium text-slate-900">{b.firm}</div>
              <div className="font-mono text-xs text-slate-500">
                {b.gstin ?? (b.pan ? `Unregistered · PAN ${b.pan}` : '—')}
              </div>
            </Td>
            <Td>{b.tehsil ?? '—'}</Td>
            <Td>{b.district ?? '—'}</Td>
            <Td>
              {b.tier ? (
                <Badge tone="neutral" variant="chip">
                  {b.tier}
                </Badge>
              ) : (
                '—'
              )}
            </Td>
            <Td numeric>{b.orderCount}</Td>
            <Td>{b.lastOrderAt ? formatDate(b.lastOrderAt) : 'never'}</Td>
            <Td numeric className={b.rateViews >= 25 ? 'font-semibold text-danger-500' : undefined}>
              {b.rateViews}
            </Td>
            <Td>{b.ownerName ?? <Badge tone="warn">queue</Badge>}</Td>
            <Td>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {!b.ownerName && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<FiUserPlus />}
                    onClick={() => onAssignToMe({ buyerId: b.buyerId, firm: b.firm })}
                  >
                    Add to my book
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<FiArrowDownLeft />}
                  onClick={() => navigate(`/sales/call/${b.buyerId}`)}
                >
                  In
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<FiArrowUpRight />}
                  onClick={() => navigate(`/sales/call/${b.buyerId}`)}
                >
                  Out
                </Button>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function WaitingTab() {
  const { callApi } = useAuth();
  const navigate = useNavigate();
  // 29 Oct — buyers only, from the server, a page at a time (the old call took
  // the first 25 pending registrations of every kind).
  const loadPage = useCallback(
    (cursor?: string) =>
      callApi((token) =>
        listRegistrationsPage(token, { stage: 'pending', kind: 'buyer', cursor, limit: 25 }),
      ),
    [callApi],
  );
  const list = usePagedList<RegistrationListItem>(loadPage);

  return (
    <Card title="Waiting on approval">
      <p className="mb-4 text-sm text-slate-500">
        Read-only awareness — approving a registration happens on the Registrations desk, not here.
      </p>
      {list.status === 'loading' && <Loader />}
      {list.status === 'error' && (
        <ErrorState message={list.error ?? 'Could not load.'} onRetry={() => void list.reload()} />
      )}
      {list.status === 'ready' &&
        (list.items.length === 0 ? (
          <p className="text-sm text-slate-500">No buyer registrations waiting.</p>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Firm</Th>
                  <Th>GSTIN</Th>
                  <Th>Age</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => (
                  <tr key={r.registrationId}>
                    <Td>{r.firm ?? '—'}</Td>
                    <Td className="font-mono text-xs">{r.gstin ?? '—'}</Td>
                    <Td>{formatDate(r.createdAt)}</Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/registrations?open=${r.registrationId}`)}
                      >
                        Open in Registrations
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <ListFooter
              shown={list.items.length}
              total={list.total}
              hasMore={list.hasMore}
              loading={list.loadingMore}
              error={list.error}
              onMore={() => void list.loadMore()}
            />
          </>
        ))}
    </Card>
  );
}
