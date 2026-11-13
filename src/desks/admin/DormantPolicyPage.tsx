import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { getPolicy, updatePolicy, type PolicySettings, type PolicyView } from '../../api/holding';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/Input';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';
import { useFormSubmit } from '../../lib/useFormSubmit';

/**
 * LOCK-34 §4.1 — Manage → Dormant policy. The switch, the go-live date and the
 * numbers behind the holding rules. Every change is logged (who, when, from,
 * to). Numbers are typed as text so typing never appends to a pre-filled value;
 * the billing amount is typed in rupees and kept in paise, the unit of an order.
 */
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const NUMBER_FIELDS = [
  ['orderedDays', 'Days without enough billing before a buyer is released', 'days'],
  ['reasonWindowDays', 'Days the holder has to say why', 'days'],
  ['leadDays', 'Days a lead or claim can go without a bill', 'days'],
  ['uncalledCap', 'Most uncalled parties one caller can hold', 'parties'],
  ['firstCallWorkingHours', 'Working hours to the first call on a new lead', 'hours'],
  ['unclaimedDays', 'Days in the Pool before the Team Leader looks', 'days'],
  ['backlogPerWeek', 'Lapsed parties opened per week at go-live', 'parties'],
] as const;

type NumberField = (typeof NUMBER_FIELDS)[number][0];

interface Draft {
  enabled: boolean;
  goLiveDate: string;
  billingRupees: string;
  numbers: Record<NumberField, string>;
  seasons: PolicySettings['seasons'];
}

const rupeesText = (paise: number): string => String(Math.round(paise) / 100);

function draftOf(s: PolicySettings): Draft {
  return {
    enabled: s.enabled,
    goLiveDate: s.goLiveDate ?? '',
    billingRupees: rupeesText(s.billingThresholdPaise),
    numbers: Object.fromEntries(NUMBER_FIELDS.map(([k]) => [k, String(s[k])])) as Record<
      NumberField,
      string
    >,
    seasons: s.seasons,
  };
}

const rupeesFormat = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function DormantPolicyPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getPolicy(token)), [callApi]);
  const { state, retry, refresh } = useAsyncData(loader, () => false, [loader]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Dormant policy</h1>
      <AsyncBoundary state={state} onRetry={retry}>
        {(view) => <PolicyForm key={JSON.stringify(view.settings)} view={view} onSaved={refresh} />}
      </AsyncBoundary>
    </div>
  );
}

function PolicyForm({ view, onSaved }: { view: PolicyView; onSaved: () => void }) {
  const { callApi } = useAuth();
  const [draft, setDraft] = useState<Draft>(() => draftOf(view.settings));
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const save = useFormSubmit<PolicyView>({
    fields: ['enabled', 'goLiveDate', 'billingThresholdPaise', ...NUMBER_FIELDS.map(([k]) => k)],
    success: 'Saved.',
    onSuccess: onSaved,
    // The page reloads its values after a save, so the message is shown as a toast.
    toastOnSuccess: true,
  });

  function submit(event: FormEvent): void {
    event.preventDefault();
    const errors: Record<string, string> = {};
    const whole = (text: string): number | null =>
      /^\d+$/.test(text.trim()) ? Number(text.trim()) : null;
    const patch: Partial<PolicySettings> = {
      enabled: draft.enabled,
      goLiveDate: draft.goLiveDate || null,
      seasons: draft.seasons,
    };
    for (const [key, label] of NUMBER_FIELDS) {
      const n = whole(draft.numbers[key]);
      if (n === null) errors[key] = `Enter ${label.toLowerCase()} as a whole number.`;
      else patch[key] = n;
    }
    const rupees = Number(draft.billingRupees.replace(/[,₹\s]/g, ''));
    if (!draft.billingRupees.trim() || !Number.isFinite(rupees) || rupees <= 0) {
      errors.billingThresholdPaise = 'Enter the billing amount in rupees, e.g. 10000.';
    } else {
      patch.billingThresholdPaise = Math.round(rupees * 100);
    }
    if (draft.enabled && !draft.goLiveDate) {
      errors.goLiveDate = 'Set the go-live date before switching this on.';
    }
    setLocalErrors(errors);
    if (Object.keys(errors).length > 0) return;
    void save.submit((key) => callApi((token) => updatePolicy(token, patch, key)));
  }

  const err = (field: string): string | undefined => localErrors[field] ?? save.fieldErrors[field];
  const set = <K extends keyof Draft>(key: K, value: Draft[K]): void => {
    setDraft((d) => ({ ...d, [key]: value }));
    save.clearFieldError(String(key));
  };

  return (
    <form onSubmit={submit} className="flex max-w-3xl flex-col gap-6">
      <Card title="Switch">
        <label className="flex items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300"
            checked={draft.enabled}
            onChange={(e) => set('enabled', e.target.checked)}
          />
          The holding rules are ON (intake, the Pool and claims)
        </label>
        {err('enabled') && <p className="mt-1 text-sm text-danger-500">{err('enabled')}</p>}
        <p className="mt-3 text-sm text-slate-600">
          Nightly check for lapsed parties:{' '}
          <Badge tone={view.nightlyJobEnabled ? 'good' : 'neutral'}>
            {view.nightlyJobEnabled ? 'running' : 'not running'}
          </Badge>{' '}
          <span className="text-slate-500">
            — turned on at the server (DORMANCY_JOB_ENABLED), not here, so nothing is released by
            accident.
          </span>
        </p>
        <div className="mt-4 max-w-xs">
          <Input
            label="Go-live date"
            type="date"
            value={draft.goLiveDate}
            onChange={(e) => set('goLiveDate', e.target.value)}
            error={err('goLiveDate')}
          />
        </div>
      </Card>

      <Card title="Numbers">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Billing that restarts a buyer’s clock (₹)"
            inputMode="decimal"
            value={draft.billingRupees}
            onChange={(e) => set('billingRupees', e.target.value)}
            hint={
              Number(draft.billingRupees.replace(/[,₹\s]/g, '')) > 0
                ? `= ${rupeesFormat.format(Number(draft.billingRupees.replace(/[,₹\s]/g, '')))}`
                : undefined
            }
            error={err('billingThresholdPaise')}
          />
          {NUMBER_FIELDS.map(([key, label, unit]) => (
            <Input
              key={key}
              label={label}
              inputMode="numeric"
              value={draft.numbers[key]}
              hint={unit}
              onChange={(e) => set('numbers', { ...draft.numbers, [key]: e.target.value })}
              error={err(key)}
            />
          ))}
        </div>
      </Card>

      <Card title="Seasons (for reports only — nothing reads these)">
        <ul className="flex flex-col gap-3">
          {draft.seasons.map((s, i) => (
            <li key={i} className="grid items-end gap-3 sm:grid-cols-3">
              <Input
                label="Season"
                value={s.name}
                onChange={(e) =>
                  set(
                    'seasons',
                    draft.seasons.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                  )
                }
              />
              {(['fromMonth', 'toMonth'] as const).map((field) => (
                <Select
                  key={field}
                  label={field === 'fromMonth' ? 'From' : 'To'}
                  value={String(s[field])}
                  onChange={(e) =>
                    set(
                      'seasons',
                      draft.seasons.map((x, j) =>
                        j === i ? { ...x, [field]: Number(e.target.value) } : x,
                      ),
                    )
                  }
                >
                  {MONTHS.map((m, n) => (
                    <option key={m} value={n + 1}>
                      {m}
                    </option>
                  ))}
                </Select>
              ))}
            </li>
          ))}
        </ul>
      </Card>

      {save.formError && (
        <p role="alert" className="text-sm text-danger-500">
          {save.formError}
        </p>
      )}
      {save.successMessage && <p className="text-sm text-success-600">{save.successMessage}</p>}
      <div>
        <Button type="submit" loading={save.submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
