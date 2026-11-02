import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { FiSave } from 'react-icons/fi';
import { getMarginMatrix, getMarginMatrixHistory, setMarginMatrixBulk } from '../../api/pricing';
import type { MarginMatrixCellDto, MarginMatrixHistoryRowDto } from '../../api/dto';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { PERMISSIONS } from '../../lib/permissions';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { formatDateTime } from '../../lib/dates';

// Row order = product class, column order = client tier, as the client's sheet lays it out.
const CLASSES = ['High', 'Medium', 'Low'] as const;
const TIERS = ['Retailer', 'Dealer', 'Distributor', 'Trader'] as const;

type Drafts = Record<string, string>;

const cellKey = (skuClass: string, tier: string): string => `${skuClass}/${tier}`;

/** 0.0572 -> "5.72". Rounded so float noise (0.07 * 100) never shows. */
const toPercentText = (pct: number): string => String(Math.round(pct * 10000) / 100);

/** "5.72" -> 0.0572, or null if it is not a number. */
function toFraction(text: string): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) ? Number((value / 100).toFixed(6)) : null;
}

function draftsFrom(cells: MarginMatrixCellDto[]): Drafts {
  const drafts: Drafts = {};
  for (const cell of cells) drafts[cellKey(cell.class, cell.tier)] = toPercentText(cell.pct);
  return drafts;
}

/** Local "now" in the yyyy-MM-ddTHH:mm form a datetime-local input takes. */
function localNowValue(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

interface MatrixData {
  cells: MarginMatrixCellDto[];
  history: MarginMatrixHistoryRowDto[];
}

/** Manage → Margin matrix. BR-040: 3 product classes × 4 client tiers. */
export function MarginMatrixPage() {
  const { callApi, hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.MARGIN_MATRIX_WRITE);
  const loader = useCallback(
    () =>
      callApi(async (token): Promise<MatrixData> => {
        const [cells, history] = await Promise.all([
          getMarginMatrix(token),
          getMarginMatrixHistory(token),
        ]);
        return { cells, history };
      }),
    [callApi],
  );
  // Never "empty": a matrix with no values yet still shows its grid, all "Not set".
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Margin matrix</h1>
      <DevNote screen="admin_margin_matrix" />
      <AsyncBoundary state={state} onRetry={retry}>
        {(data) => (
          <>
            <MatrixEditor cells={data.cells} canEdit={canEdit} onSaved={retry} />
            <HistoryCard history={data.history} />
          </>
        )}
      </AsyncBoundary>
    </div>
  );
}

function MatrixEditor({
  cells,
  canEdit,
  onSaved,
}: {
  cells: MarginMatrixCellDto[];
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

  const changedKeys = Object.keys(drafts).filter(
    (key) => (drafts[key] ?? '') !== (saved[key] ?? ''),
  );
  const unsetCount = CLASSES.length * TIERS.length - Object.keys(saved).length;

  // BR-042 — Class High thinnest, Class Low widest. A soft warning, never a block.
  const orderWarnings = TIERS.filter((tier) => {
    const values = CLASSES.map((c) => toFraction(drafts[cellKey(c, tier)] ?? ''));
    if (values.some((v) => v === null)) return false;
    const [high, medium, low] = values as number[];
    return !(high < medium && medium < low);
  });

  function validate(): string | null {
    for (const key of changedKeys) {
      const text = drafts[key] ?? '';
      if (text.trim() === '')
        return `${key.replace('/', ' / ')} was set before and can't be cleared.`;
      const fraction = toFraction(text);
      if (fraction === null || fraction < 0 || fraction > 1) {
        return `${key.replace('/', ' / ')} must be a percentage between 0 and 100.`;
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
      await callApi((token) =>
        setMarginMatrixBulk(token, {
          effectiveFrom: new Date(effectiveFrom).toISOString(),
          cells: changedKeys.map((key) => {
            const [skuClass, tier] = key.split('/');
            return { class: skuClass, tier, pct: toFraction(drafts[key]) as number };
          }),
        }),
      );
      show(`${changedKeys.length} margin ${changedKeys.length === 1 ? 'cell' : 'cells'} saved.`);
      onSaved();
    } catch (submitError) {
      setError(
        submitError instanceof ApiError ? submitError.message : 'Could not save the margin matrix.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <p className="mb-4 text-sm text-slate-500">
        Margin % added on landed cost, by product class (rows) and client type (columns). Changes
        apply to future orders only — orders already placed keep the margin they were priced with.
      </p>
      {unsetCount > 0 && (
        <p
          role="status"
          className="mb-4 rounded-md bg-warning-50 px-3 py-2 text-sm text-warning-600"
        >
          {unsetCount} of 12 cells are not set. Orders for a class and client type with no margin
          cannot be priced until it is entered.
        </p>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Table>
          <thead>
            <tr>
              <Th>Product class</Th>
              {TIERS.map((tier) => (
                <Th key={tier} numeric>
                  {tier}
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLASSES.map((skuClass) => (
              <tr key={skuClass}>
                <Td className="font-medium">{skuClass}</Td>
                {TIERS.map((tier) => {
                  const key = cellKey(skuClass, tier);
                  const isSet = key in saved;
                  return (
                    <Td key={tier} numeric>
                      {canEdit ? (
                        <div className="ml-auto flex w-28 items-center gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={100}
                            step="0.01"
                            value={drafts[key] ?? ''}
                            placeholder="Not set"
                            aria-label={`${skuClass} class margin for ${tier}, percent`}
                            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-right text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline focus:outline-2 focus:outline-brand-500/30"
                          />
                          <span className="text-slate-500">%</span>
                        </div>
                      ) : isSet ? (
                        `${saved[key]}%`
                      ) : (
                        <span className="text-slate-400">Not set</span>
                      )}
                    </Td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </Table>

        {orderWarnings.length > 0 && (
          <p role="status" className="text-sm text-warning-600">
            BR-042 — Class High should be the thinnest margin and Class Low the widest. Check the{' '}
            {orderWarnings.join(', ')} {orderWarnings.length === 1 ? 'column' : 'columns'}.
          </p>
        )}

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
              disabled={changedKeys.length === 0}
              icon={<FiSave />}
            >
              Save{' '}
              {changedKeys.length > 0
                ? `${changedKeys.length} change${changedKeys.length === 1 ? '' : 's'}`
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

function HistoryCard({ history }: { history: MarginMatrixHistoryRowDto[] }) {
  const now = Date.now();
  return (
    <Card title="History">
      {history.length === 0 ? (
        <p className="text-sm text-slate-500">No margin values have been saved yet.</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Effective from</Th>
              <Th>Product class</Th>
              <Th>Client type</Th>
              <Th numeric>Margin</Th>
              <Th>Saved on</Th>
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.marginMatrixId}>
                <Td>
                  {formatDateTime(row.effectiveFrom)}
                  {new Date(row.effectiveFrom).getTime() > now && (
                    <span className="ml-2 rounded bg-warning-50 px-1.5 py-0.5 text-xs text-warning-600">
                      Scheduled
                    </span>
                  )}
                </Td>
                <Td>{row.class}</Td>
                <Td>{row.tier}</Td>
                <Td numeric>{toPercentText(row.pct)}%</Td>
                <Td>{formatDateTime(row.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  );
}
