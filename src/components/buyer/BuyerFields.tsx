import { useCallback, useEffect, useState } from 'react';
import { getAssignableSalesPeople } from '../../api/sales';
import type { AssignableSalesPerson } from '../../api/dto';
import type { BuyerCategory, BuyerConfirmations } from '../../api/onboarding';
import { ApiError } from '../../api/errors';
import { useAuth } from '../../auth/AuthContext';
import { isValidGstin, isValidPan, panFromGstin } from '../../lib/validators';
import { Input, Select } from '../ui/Input';

/**
 * Phase 3 — the pieces the buyer forms share (register, approve, Edit).
 * Field names match the server's, so the form kit's `fieldErrors` drop
 * straight in.
 */

export const BUYER_CATEGORIES: BuyerCategory[] = ['Retailer', 'Dealer', 'Distributor', 'Trader'];

export function CategorySelect({
  value,
  onChange,
  error,
  disabled,
  hint,
}: {
  value: BuyerCategory | '';
  onChange: (value: BuyerCategory | '') => void;
  error?: string;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <Select
      label="Category"
      required
      value={value}
      disabled={disabled}
      hint={hint ?? 'The margin-matrix column his rates come from.'}
      onChange={(e) => onChange(e.target.value as BuyerCategory | '')}
      error={error}
    >
      <option value="">Select…</option>
      {BUYER_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </Select>
  );
}

/**
 * GSTIN, then PAN. A GSTIN fills PAN in from its characters 3–12 and locks
 * it; without a GSTIN the PAN is typed and he is "Unregistered". At least one
 * is needed (DEC-054) — the server says so in one message on `gstin`.
 */
export function GstinPanFields({
  gstin,
  pan,
  onChange,
  errors,
  disabled,
}: {
  gstin: string;
  pan: string;
  onChange: (next: { gstin: string; pan: string }) => void;
  errors: { gstin?: string; pan?: string };
  disabled?: boolean;
}) {
  const typedGstin = gstin.trim().toUpperCase();
  const gstinLooksDone = typedGstin.length === 15;
  const gstinError =
    errors.gstin ??
    (gstinLooksDone && !isValidGstin(typedGstin) ? 'That GSTIN does not check out.' : undefined);
  const panLocked = typedGstin.length > 0;
  const typedPan = pan.trim().toUpperCase();
  const panError =
    errors.pan ??
    (!panLocked && typedPan.length === 10 && !isValidPan(typedPan)
      ? 'Enter the PAN as 5 letters, 4 digits and 1 letter.'
      : undefined);
  return (
    <>
      <Input
        label="GSTIN"
        maxLength={15}
        disabled={disabled}
        hint="Leave blank if he has no GSTIN, and enter his PAN instead."
        value={gstin}
        onChange={(e) => {
          const next = e.target.value.toUpperCase().replace(/\s/g, '');
          onChange({
            gstin: next,
            pan: next ? (next.length >= 12 ? panFromGstin(next) : '') : pan,
          });
        }}
        error={gstinError}
      />
      <Input
        label="PAN"
        maxLength={10}
        required={!panLocked}
        disabled={disabled || panLocked}
        hint={
          panLocked ? 'Taken from the GSTIN (characters 3–12).' : 'Needed when there is no GSTIN.'
        }
        value={pan}
        onChange={(e) => onChange({ gstin, pan: e.target.value.toUpperCase().replace(/\s/g, '') })}
        error={panError}
      />
    </>
  );
}

export interface ConfirmWarning {
  key: 'sharedMobile' | 'panInsideGstin';
  field: string;
  message: string;
  existingFirm: string;
}

/** Reads the warnings out of a CONFIRMATION_REQUIRED refusal; [] for anything else. */
export function warningsFrom(error: unknown): ConfirmWarning[] {
  if (!(error instanceof ApiError) || error.code !== 'CONFIRMATION_REQUIRED') return [];
  const warnings = error.meta?.warnings;
  return Array.isArray(warnings) ? (warnings as ConfirmWarning[]) : [];
}

/** One tick per warning; ticking all of them lets the same save go through. */
export function ConfirmWarnings({
  warnings,
  value,
  onChange,
}: {
  warnings: ConfirmWarning[];
  value: BuyerConfirmations;
  onChange: (next: BuyerConfirmations) => void;
}) {
  if (warnings.length === 0) return null;
  return (
    <div className="col-span-2 flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
      <p className="text-sm font-medium text-slate-800">Please confirm before saving</p>
      {warnings.map((w) => (
        <label key={w.key} className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-slate-300"
            checked={Boolean(value[w.key])}
            onChange={(e) => onChange({ ...value, [w.key]: e.target.checked })}
          />
          {w.message}
        </label>
      ))}
    </div>
  );
}

/**
 * Who this buyer is assigned to. The list is the caller's own choice set
 * (himself as an executive; his team as a leader; every Sales person for
 * Admin). `allowQueue` adds "Queue (nobody yet)" — registering may leave
 * him there, approval may not (DEC-062).
 */
export function AssigneeSelect({
  value,
  onChange,
  error,
  allowQueue,
  required,
  current,
  onLoaded,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  allowQueue: boolean;
  required?: boolean;
  /** Someone already assigned who may not be in the caller's own list. */
  current?: { employeeId: string; person: string } | null;
  /** Called once the list arrives — e.g. to pre-select the caller himself. */
  onLoaded?: (people: AssignableSalesPerson[]) => void;
}) {
  const { callApi } = useAuth();
  const [people, setPeople] = useState<AssignableSalesPerson[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(
    () =>
      callApi((token) => getAssignableSalesPeople(token))
        .then((list) => {
          setPeople(list);
          onLoaded?.(list);
        })
        .catch(() => setLoadError('Could not load who can be assigned.')),
    // `onLoaded` is read once, when the list first arrives.
    [callApi],
  );
  useEffect(() => void load(), [load]);
  const options =
    current && !people.some((p) => p.employeeId === current.employeeId)
      ? [...people, { ...current, isSelf: false }]
      : people;
  return (
    <Select
      label="Assigned to"
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error ?? loadError ?? undefined}
    >
      {allowQueue ? (
        <option value="">Queue (nobody yet)</option>
      ) : (
        <option value="">Select…</option>
      )}
      {options.map((p) => (
        <option key={p.employeeId} value={p.employeeId}>
          {p.person}
          {p.isSelf ? ' (me)' : ''}
        </option>
      ))}
    </Select>
  );
}
