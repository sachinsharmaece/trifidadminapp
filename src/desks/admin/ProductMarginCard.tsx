import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { FiSave } from 'react-icons/fi';
import { getProductMargin, getProductMarginHistory, setProductMargin } from '../../api/pricing';
import type { ProductMarginRowDto } from '../../api/dto';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { newIdempotencyKey } from '../../lib/idempotency';
import { PERMISSIONS } from '../../lib/permissions';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../lib/dates';

// Same column order as Manage → Margin matrix.
const TIERS = ['Retailer', 'Dealer', 'Distributor', 'Trader'] as const;

type Drafts = Record<string, string>;

/** 900 paise -> "9", 950 -> "9.5". */
const toRupeeText = (paise: number): string => String(paise / 100);

/** "9.5" -> 950 paise, or null if it is not a rupee amount (negative, or finer than a paisa). */
function toPaise(text: string): number | null {
  const value = Number(text);
  if (text.trim() === '' || !Number.isFinite(value) || value < 0) return null;
  const paise = Math.round(value * 100);
  return Math.abs(paise - value * 100) < 1e-6 ? paise : null;
}

const rupees = (paise: number): string => `₹${(paise / 100).toFixed(2)}`;

function draftsFrom(cells: ProductMarginRowDto[]): Drafts {
  const drafts: Drafts = {};
  for (const cell of cells) {
    if (cell.marginPaise !== null) drafts[cell.tier] = toRupeeText(cell.marginPaise);
  }
  return drafts;
}

/** Local "now" in the yyyy-MM-ddTHH:mm form a datetime-local input takes. */
function localNowValue(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

interface MarginData {
  cells: ProductMarginRowDto[];
  history: ProductMarginRowDto[];
}

/**
 * Manage → Products → Product details: this product's own margin, in rupees (BR-040 override).
 * Where a client type has no value here, the class margin from Manage → Margin matrix applies.
 */
export function ProductMarginCard({ productId }: { productId: string }) {
  const { hasPermission } = useAuth();
  if (!hasPermission(PERMISSIONS.MARGIN_MATRIX_READ)) return null;
  return (
    <ProductMarginBody
      productId={productId}
      canEdit={hasPermission(PERMISSIONS.MARGIN_MATRIX_WRITE)}
    />
  );
}

function ProductMarginBody({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () =>
      callApi(async (token): Promise<MarginData> => {
        const [cells, history] = await Promise.all([
          getProductMargin(token, productId),
          getProductMarginHistory(token, productId),
        ]);
        return { cells, history };
      }),
    [callApi, productId],
  );
  // Never "empty": a product with no value yet still shows its grid, all on the class margin.
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(data) => (
        <>
          <MarginEditor
            productId={productId}
            cells={data.cells}
            canEdit={canEdit}
            onSaved={retry}
          />
          <HistoryCard history={data.history} />
        </>
      )}
    </AsyncBoundary>
  );
}

function MarginEditor({
  productId,
  cells,
  canEdit,
  onSaved,
}: {
  productId: string;
  cells: ProductMarginRowDto[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [saved, setSaved] = useState<Drafts>(() => draftsFrom(cells));
  const [drafts, setDrafts] = useState<Drafts>(() => draftsFrom(cells));
  const [effectiveFrom, setEffectiveFrom] = useState(localNowValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Fresh server values (after a save + reload) reset the form.
  useEffect(() => {
    const fresh = draftsFrom(cells);
    setSaved(fresh);
    setDrafts(fresh);
    setEffectiveFrom(localNowValue());
  }, [cells]);

  const changedTiers = TIERS.filter((tier) => (drafts[tier] ?? '') !== (saved[tier] ?? ''));

  function validate(): string | null {
    for (const tier of changedTiers) {
      const text = drafts[tier] ?? '';
      // Blank is allowed: it sends the tier back to the class margin.
      if (text.trim() !== '' && toPaise(text) === null) {
        return `${tier} must be a rupee amount, 0 or more, with at most two decimals.`;
      }
    }
    return null;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const key = newIdempotencyKey();
      await callApi((token) =>
        setProductMargin(
          token,
          productId,
          {
            effectiveFrom: new Date(effectiveFrom).toISOString(),
            cells: changedTiers.map((tier) => ({
              tier,
              marginPaise: (drafts[tier] ?? '').trim() === '' ? null : toPaise(drafts[tier] ?? ''),
            })),
          },
          key,
        ),
      );
      show(
        `${changedTiers.length} product margin ${changedTiers.length === 1 ? 'cell' : 'cells'} saved.`,
      );
      onSaved();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError
          ? submitError.message
          : 'Could not save the product margin.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="Product margin (₹)">
      <p className="mb-4 text-sm text-slate-500">
        This product&apos;s own margin in rupees, per litre, kg or piece, GST included — so every
        pack size of it gets the same amount. Where a client type is left blank, the class margin %
        from Margin matrix applies. Changes apply to future orders only.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Table>
          <thead>
            <tr>
              {TIERS.map((tier) => (
                <Th key={tier} numeric>
                  {tier}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {TIERS.map((tier) => (
                <Td key={tier} numeric>
                  {canEdit ? (
                    <div className="ml-auto flex w-32 items-center gap-1">
                      <span className="text-slate-500">₹</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="0.01"
                        value={drafts[tier] ?? ''}
                        placeholder="Class margin"
                        aria-label={`${tier} margin for this product, rupees`}
                        onChange={(e) => setDrafts((d) => ({ ...d, [tier]: e.target.value }))}
                        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30"
                      />
                    </div>
                  ) : tier in saved ? (
                    `₹${saved[tier]}`
                  ) : (
                    <span className="text-slate-400">Class margin</span>
                  )}
                </Td>
              ))}
            </tr>
          </tbody>
        </Table>

        {canEdit && (
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Effective from"
              type="datetime-local"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              hint="Orders placed from this time use the new values."
            />
            <Button
              type="submit"
              loading={submitting}
              disabled={changedTiers.length === 0}
              icon={<FiSave />}
            >
              Save{' '}
              {changedTiers.length > 0
                ? `${changedTiers.length} change${changedTiers.length === 1 ? '' : 's'}`
                : 'changes'}
            </Button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
      </form>
    </Card>
  );
}

function HistoryCard({ history }: { history: ProductMarginRowDto[] }) {
  const now = Date.now();
  return (
    <Card title="Product margin history">
      {history.length === 0 ? (
        <p className="text-sm text-slate-500">
          No product margin has been saved yet — this product uses the class margin.
        </p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Effective from</Th>
              <Th>Client type</Th>
              <Th numeric>Margin</Th>
              <Th>Saved on</Th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.productMarginId}>
                <Td>
                  {formatDateTime(row.effectiveFrom)}
                  {new Date(row.effectiveFrom).getTime() > now && (
                    <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 text-xs text-warning-600">
                      Scheduled
                    </span>
                  )}
                </Td>
                <Td>{row.tier}</Td>
                <Td numeric>
                  {row.marginPaise === null ? (
                    <span className="text-slate-500">Class margin</span>
                  ) : (
                    rupees(row.marginPaise)
                  )}
                </Td>
                <Td>{formatDateTime(row.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
