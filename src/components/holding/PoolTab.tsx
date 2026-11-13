import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  assignFromPool,
  claimParty,
  getPool,
  getWaiting,
  leavePool,
  setReceivingLeads,
  type DeskCaller,
  type DeskCard,
  type HoldingStatus,
  type PoolCard,
  type PoolPage,
} from '../../api/holding';
import { ApiError } from '../../api/errors';
import { formatDate } from '../../lib/dates';
import { newIdempotencyKey } from '../../lib/idempotency';
import { useDebounced } from '../../lib/usePagedList';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input, Select } from '../ui/Input';
import { Loader } from '../ui/Loader';
import { Modal } from '../ui/Modal';
import { useOptionalToast } from '../ui/Toast';
import { REASON_LABEL, placeText } from './holdingFormat';

type Section = 'ordered' | 'new';
const PAGE = 50;

/**
 * LOCK-34 — Buyers → Pool (replaces the Queue tab while the policy is on). Two
 * sections, ordered parties and new leads, longest in the Pool first. A card
 * shows the firm, the place and who held him before — no mobile, no GSTIN, no
 * amounts; those come with the buyer file once he is claimed.
 */
export function PoolTab({ status }: { status: HoldingStatus }) {
  const { callApi } = useAuth();
  const toast = useOptionalToast();
  const [section, setSection] = useState<Section>('ordered');
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [page, setPage] = useState<PoolPage | null>(null);
  const [items, setItems] = useState<PoolCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = useCallback(
    async (offset: number) => {
      try {
        const next = await callApi((token) =>
          getPool(token, { section, q: q || undefined, offset, limit: PAGE }),
        );
        setPage(next);
        setItems((current) => (offset === 0 ? next.items : [...current, ...next.items]));
        setError(null);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : 'Could not load the Pool.');
      }
    },
    [callApi, section, q],
  );
  useEffect(() => {
    setPage(null);
    void load(0);
  }, [load]);

  async function claim(card: PoolCard): Promise<void> {
    setClaiming(card.buyerId);
    try {
      await callApi((token) => claimParty(token, card.buyerId, newIdempotencyKey()));
      toast?.show(`${card.firm} is now yours. Call him first.`);
      await load(0);
    } catch (e) {
      toast?.show(e instanceof ApiError ? e.message : 'Could not claim him.');
      await load(0); // someone else may have got there first
    } finally {
      setClaiming(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status.isTeamLeader && <WaitingBlock onChanged={() => void load(0)} />}

      <div className="flex flex-wrap items-end gap-3">
        {(['ordered', 'new'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={section === s ? 'primary' : 'secondary'}
            onClick={() => setSection(s)}
          >
            {s === 'ordered' ? 'Ordered parties' : 'New leads'}
            {page ? ` (${page.counts[s]})` : ''}
          </Button>
        ))}
        <div className="w-full max-w-sm">
          <Input
            label="Search"
            placeholder="Firm, tehsil or district"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-danger-500">{error}</p>}
      {!page && !error && <Loader />}
      {page && items.length === 0 && (
        <p className="text-sm text-slate-500">
          {q ? <>No match for &quot;{q}&quot;.</> : 'Nobody is in this part of the Pool.'}
        </p>
      )}

      {page && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((card) => (
            <li key={card.buyerId}>
              <PoolCardView
                card={card}
                canClaim={status.isCaller}
                claimAllowed={page.claim.allowed}
                claimReason={page.claim.reason}
                claiming={claiming === card.buyerId}
                onClaim={() => void claim(card)}
              />
            </li>
          ))}
        </ul>
      )}
      {page && items.length < page.total && (
        <div>
          <Button variant="secondary" size="sm" onClick={() => void load(items.length)}>
            Show more ({page.total - items.length} left)
          </Button>
        </div>
      )}
    </div>
  );
}

function PoolCardView({
  card,
  canClaim,
  claimAllowed,
  claimReason,
  claiming,
  onClaim,
  actions,
}: {
  card: PoolCard;
  canClaim: boolean;
  claimAllowed: boolean;
  claimReason: string | null;
  claiming: boolean;
  onClaim: () => void;
  actions?: ReactNode;
}) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{card.firm}</div>
          <div className="text-sm text-slate-600">{placeText(card)}</div>
          <div className="text-xs text-slate-500">
            In the Pool since {formatDate(card.enteredAt)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {actions}
          {canClaim && (
            <>
              <Button size="sm" disabled={!claimAllowed} loading={claiming} onClick={onClaim}>
                Claim
              </Button>
              {!claimAllowed && claimReason && (
                <span className="max-w-56 text-right text-xs text-danger-500">{claimReason}</span>
              )}
            </>
          )}
        </div>
      </div>
      {card.previousHolders.length > 0 && (
        <ul className="mt-3 space-y-0.5 border-t border-slate-100 pt-3 text-sm text-slate-600">
          {card.previousHolders.map((h, i) => (
            <li key={i}>
              {h.holder} · {formatDate(h.from)}
              {h.to ? ` – ${formatDate(h.to)}` : ''} ·{' '}
              {h.reason ? (
                REASON_LABEL[h.reason]
              ) : h.systemMarked ? (
                <Badge tone="warn">owner did not diagnose</Badge>
              ) : (
                '—'
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// The Team Leader's block: "Waiting 3+ days"
// ---------------------------------------------------------------------------

function WaitingBlock({ onChanged }: { onChanged: () => void }) {
  const { callApi } = useAuth();
  const toast = useOptionalToast();
  const [data, setData] = useState<{
    items: DeskCard[];
    callers: DeskCaller[];
    unclaimedDays: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<DeskCard | null>(null);
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setData(await callApi((token) => getWaiting(token)));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load the list.');
    }
  }, [callApi]);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(work: () => Promise<unknown>, done: string): Promise<void> {
    setBusy(true);
    try {
      await work();
      toast?.show(done);
      setAssigning(null);
      setPick('');
      await load();
      onChanged();
    } catch (e) {
      toast?.show(e instanceof ApiError ? e.message : 'That did not work.');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-danger-500">{error}</p>;
  if (!data) return null;

  const eligible = (card: DeskCard) =>
    data.callers.filter((c) => c.employeeId !== card.lastHolderId && c.uncalled < c.cap);

  return (
    <Card title={`Waiting ${data.unclaimedDays}+ days (${data.items.length})`}>
      {data.items.length === 0 ? (
        <p className="text-sm text-slate-500">Nobody has been waiting that long.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((card) => (
            <li key={card.buyerId}>
              <PoolCardView
                card={card}
                canClaim={false}
                claimAllowed={false}
                claimReason={null}
                claiming={false}
                onClaim={() => undefined}
                actions={
                  <div className="flex gap-2">
                    <Badge tone="warn">{card.daysWaiting} days</Badge>
                    <Button size="sm" onClick={() => setAssigning(card)}>
                      Assign
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => callApi((t) => leavePool(t, card.buyerId, newIdempotencyKey())),
                          `${card.firm} left in the Pool.`,
                        )
                      }
                    >
                      Leave
                    </Button>
                  </div>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-slate-100 pt-4">
        <h3 className="mb-2 text-sm font-medium text-slate-700">Receiving new leads</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {data.callers.map((c) => (
            <li key={c.employeeId} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {c.person}{' '}
                <span className="text-slate-500">
                  (uncalled {c.uncalled} / {c.cap})
                </span>
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy || !c.canSwitch}
                onClick={() =>
                  void run(
                    () =>
                      callApi((t) =>
                        setReceivingLeads(t, c.employeeId, !c.receivingLeads, newIdempotencyKey()),
                      ),
                    `${c.person} will ${c.receivingLeads ? 'not ' : ''}receive new leads.`,
                  )
                }
              >
                {c.receivingLeads ? 'On' : 'Off'}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Modal
        open={assigning !== null}
        title={assigning ? `Assign ${assigning.firm}` : 'Assign'}
        onClose={() => setAssigning(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssigning(null)}>
              Cancel
            </Button>
            <Button
              disabled={!pick}
              loading={busy}
              onClick={() =>
                assigning &&
                void run(
                  () =>
                    callApi((t) => assignFromPool(t, assigning.buyerId, pick, newIdempotencyKey())),
                  `${assigning.firm} assigned.`,
                )
              }
            >
              Assign
            </Button>
          </div>
        }
      >
        {assigning && (
          <Select label="Give him to" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">Pick a caller</option>
            {eligible(assigning).map((c) => (
              <option key={c.employeeId} value={c.employeeId}>
                {c.person} — uncalled {c.uncalled} / {c.cap}
              </option>
            ))}
          </Select>
        )}
      </Modal>
    </Card>
  );
}
