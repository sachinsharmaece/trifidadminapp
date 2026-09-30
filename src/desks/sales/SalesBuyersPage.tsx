import { useCallback, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { FiArrowDownLeft, FiArrowUpRight, FiUserPlus } from 'react-icons/fi';
import { listSalesBuyers, type BuyerListRow } from '../../api/sales';
import { listRegistrations } from '../../api/onboarding';
import { assignBook } from '../../api/admin';
import type { RegistrationListItem } from '../../api/dto';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';

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
  // Live filter, as-you-type, no submit button — filters the already-fetched
  // list client-side; re-fetches only when the tab itself changes.
  const [q, setQ] = useState('');
  const [assigning, setAssigning] = useState<{ buyerId: string; firm: string } | null>(null);
  const loader = useCallback(
    () => callApi((token) => listSalesBuyers(token, { tab })),
    [callApi, tab],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Search"
        placeholder="Firm, GSTIN, tehsil…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nobody here yet.">
        {(items) => (
          <BuyerTable items={items} q={q} navigate={navigate} onAssignToMe={setAssigning} />
        )}
      </AsyncBoundary>
      <AssignToBookModal
        target={assigning}
        onClose={() => setAssigning(null)}
        onAssigned={() => {
          setAssigning(null);
          retry();
        }}
      />
    </div>
  );
}

/**
 * B-10 — BR-276's automatic queue-to-book trigger fires on a buyer's first
 * order, but if no Sales employee is active at that exact moment it
 * silently leaves him in Queue with no retry (`ensureBookAssignment`,
 * `modules/chain/chain.service.ts`). This is the already-built manual
 * fallback (`POST /admin/book-assignments`) — previously not wired to any
 * screen, so a buyer stuck this way had no way out at all.
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
  const { show } = useToast();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!target || !me) return;
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        assignBook(token, { buyerId: target.buyerId, ownerEmployeeId: me.employeeId, reason }),
      );
      show(`${target.firm} is now in your book.`);
      setReason('');
      onAssigned();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not assign this buyer.',
      );
    } finally {
      setSubmitting(false);
    }
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
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={submitting}>
            Add to my book
          </Button>
        </div>
      </form>
    </Modal>
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
      [b.firm, b.gstin, b.tehsil].some((field) => field?.toLowerCase().includes(needle)),
    );
  }, [items, q]);

  if (filtered.length === 0) {
    return <p className="text-sm text-slate-500">No match for &quot;{q}&quot;.</p>;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Firm</Th>
          <Th>Tehsil</Th>
          <Th>Position</Th>
          <Th numeric>Orders</Th>
          <Th>Last order</Th>
          <Th numeric>Rate views</Th>
          <Th>Owner</Th>
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
              <div className="font-mono text-xs text-slate-500">{b.gstin ?? '—'}</div>
            </Td>
            <Td>{b.tehsil ?? '—'}</Td>
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
            <Td>{b.lastOrderAt ? new Date(b.lastOrderAt).toLocaleDateString() : 'never'}</Td>
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
  const loader = useCallback(
    () => callApi((token) => listRegistrations(token, 'pending')),
    [callApi],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Waiting on approval">
      <p className="mb-4 text-sm text-slate-500">
        Read-only awareness — approving a registration happens on the Registrations desk, not here.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nobody waiting.">
        {(items: RegistrationListItem[]) => {
          const buyers = items.filter((r) => r.kind === 'buyer' || r.kind === 'both');
          return buyers.length === 0 ? (
            <p className="text-sm text-slate-500">No buyer registrations waiting.</p>
          ) : (
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
                {buyers.map((r) => (
                  <tr key={r.registrationId}>
                    <Td>{r.firm ?? '—'}</Td>
                    <Td className="font-mono text-xs">{r.gstin ?? '—'}</Td>
                    <Td>{new Date(r.createdAt).toLocaleDateString()}</Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate('/registrations')}
                      >
                        Open in Registrations
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
  );
}
