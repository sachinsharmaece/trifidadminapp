import { useCallback, useEffect, useMemo, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import {
  createDistrict,
  createState,
  createTehsil,
  getDistricts,
  getStates,
  getTehsils,
} from '../../api/territory';
import type { DistrictDto, StateDto, TehsilDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { SearchSelect, type SearchSelectOption } from '../ui/SearchSelect';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export interface LocationPick {
  stateId: string;
  districtId: string;
  tehsilId: string;
}

export interface LocationPickErrors {
  stateId?: string;
  districtId?: string;
  tehsilId?: string;
}

/** Human names of the current pick, for notes and summaries. */
export interface LocationPickNames {
  state: string;
  district: string;
  tehsil: string;
}

const matches = (query: string) => (label: string) =>
  label.toLowerCase().includes(query.trim().toLowerCase());

/**
 * State → District → Tehsil as searchable, cascading dropdowns (Phase 1).
 * Picking a state clears the district and tehsil below it, and so on down.
 * Under each list, staff who may add masters (Admin, team leaders —
 * `location:master_write`) get "+ Add new"; everyone else is told to ask
 * their leader. The server enforces the same rule.
 */
export function LocationPickers({
  value,
  onChange,
  errors = {},
  required = false,
  showTehsil = true,
  onNamesChange,
}: {
  value: LocationPick;
  onChange: (next: LocationPick) => void;
  errors?: LocationPickErrors;
  required?: boolean;
  showTehsil?: boolean;
  onNamesChange?: (names: LocationPickNames) => void;
}) {
  const { callApi, hasPermission } = useAuth();
  const canAdd = hasPermission(PERMISSIONS.LOCATION_MASTER_WRITE);
  const [states, setStates] = useState<StateDto[]>([]);
  const [districts, setDistricts] = useState<DistrictDto[]>([]);
  const [tehsils, setTehsils] = useState<TehsilDto[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState({ state: '', district: '', tehsil: '' });

  const loadStates = useCallback(
    () =>
      callApi((token) => getStates(token))
        .then(setStates)
        .catch(() => setLoadError('Could not load the state list.')),
    [callApi],
  );
  const loadDistricts = useCallback(
    (stateId: string) =>
      stateId
        ? callApi((token) => getDistricts(token, stateId))
            .then(setDistricts)
            .catch(() => setLoadError('Could not load the district list.'))
        : Promise.resolve(setDistricts([])),
    [callApi],
  );
  const loadTehsils = useCallback(
    (districtId: string) =>
      districtId
        ? callApi((token) => getTehsils(token, { districtId }))
            .then(setTehsils)
            .catch(() => setLoadError('Could not load the tehsil list.'))
        : Promise.resolve(setTehsils([])),
    [callApi],
  );

  useEffect(() => void loadStates(), [loadStates]);
  useEffect(() => void loadDistricts(value.stateId), [loadDistricts, value.stateId]);
  useEffect(() => void loadTehsils(value.districtId), [loadTehsils, value.districtId]);

  const names = useMemo<LocationPickNames>(
    () => ({
      state: states.find((s) => s.stateId === value.stateId)?.name ?? '',
      district: districts.find((d) => d.districtId === value.districtId)?.name ?? '',
      tehsil: tehsils.find((t) => t.tehsilId === value.tehsilId)?.name ?? '',
    }),
    [states, districts, tehsils, value],
  );
  useEffect(() => onNamesChange?.(names), [names, onNamesChange]);

  const stateOptions: SearchSelectOption[] = states
    .filter((s) => matches(query.state)(s.name))
    .map((s) => ({ value: s.stateId, label: s.name, detail: `GST code ${s.gstStateCode}` }));
  const districtOptions: SearchSelectOption[] = districts
    .filter((d) => matches(query.district)(d.name))
    .map((d) => ({ value: d.districtId, label: d.name }));
  const tehsilOptions: SearchSelectOption[] = tehsils
    .filter((t) => matches(query.tehsil)(t.name))
    .map((t) => ({ value: t.tehsilId, label: t.name }));

  const askLeader = (
    <p className="mt-1 text-xs text-slate-500">Not in the list? Ask your leader.</p>
  );

  return (
    <div className="flex flex-col gap-3">
      {loadError && (
        <p role="alert" className="text-sm text-danger-500">
          {loadError}
        </p>
      )}
      <div>
        <SearchSelect
          label="State"
          required={required}
          options={stateOptions}
          value={value.stateId}
          selectedLabel={names.state}
          onSearch={(q) => setQuery((c) => ({ ...c, state: q }))}
          onChange={(stateId) =>
            stateId !== value.stateId && onChange({ stateId, districtId: '', tehsilId: '' })
          }
        />
        <FieldError message={errors.stateId} />
        {canAdd ? (
          <AddNew
            what="state"
            withCode
            onAdd={async (key, name, gstStateCode) => {
              const created = await callApi((token) =>
                createState(token, { name, gstStateCode: gstStateCode ?? '' }, key),
              );
              await loadStates();
              onChange({ stateId: created.stateId, districtId: '', tehsilId: '' });
            }}
          />
        ) : (
          askLeader
        )}
      </div>

      <div>
        <SearchSelect
          label="District"
          required={required}
          disabled={!value.stateId}
          placeholder={value.stateId ? 'Type to search…' : 'Pick the state first'}
          options={districtOptions}
          value={value.districtId}
          selectedLabel={names.district}
          onSearch={(q) => setQuery((c) => ({ ...c, district: q }))}
          onChange={(districtId) =>
            districtId !== value.districtId &&
            onChange({ stateId: value.stateId, districtId, tehsilId: '' })
          }
        />
        <FieldError message={errors.districtId} />
        {value.stateId &&
          (canAdd ? (
            <AddNew
              what="district"
              onAdd={async (key, name) => {
                const created = await callApi((token) =>
                  createDistrict(token, { name, stateId: value.stateId }, key),
                );
                await loadDistricts(value.stateId);
                onChange({ stateId: value.stateId, districtId: created.districtId, tehsilId: '' });
              }}
            />
          ) : (
            askLeader
          ))}
      </div>

      {showTehsil && (
        <div>
          <SearchSelect
            label="Tehsil"
            required={required}
            disabled={!value.districtId}
            placeholder={value.districtId ? 'Type to search…' : 'Pick the district first'}
            options={tehsilOptions}
            value={value.tehsilId}
            selectedLabel={names.tehsil}
            onSearch={(q) => setQuery((c) => ({ ...c, tehsil: q }))}
            onChange={(tehsilId) => onChange({ ...value, tehsilId })}
          />
          <FieldError message={errors.tehsilId} />
          {value.districtId &&
            (canAdd ? (
              <AddNew
                what="tehsil"
                onAdd={async (key, name) => {
                  const created = await callApi((token) =>
                    createTehsil(token, { name, districtId: value.districtId }, key),
                  );
                  await loadTehsils(value.districtId);
                  onChange({ ...value, tehsilId: created.tehsilId });
                }}
              />
            ) : (
              askLeader
            ))}
        </div>
      )}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-danger-500">
      {message}
    </p>
  );
}

/** "+ Add new" under a list: a one-line inline form, saved through the form kit. */
function AddNew({
  what,
  withCode = false,
  onAdd,
}: {
  what: 'state' | 'district' | 'tehsil';
  withCode?: boolean;
  onAdd: (idempotencyKey: string, name: string, gstStateCode?: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const form = useFormSubmit<void>({
    fields: withCode ? ['name', 'gstStateCode'] : ['name'],
    success: `New ${what} added and picked.`,
    onSuccess: () => {
      setName('');
      setCode('');
      setOpen(false);
    },
  });

  if (!open) {
    return (
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
          onClick={() => {
            form.clearMessages();
            setOpen(true);
          }}
        >
          <FiPlus /> Add new {what}
        </button>
        {form.successMessage && (
          <span className="text-xs text-success-600">{form.successMessage}</span>
        )}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-48 flex-1">
          <Input
            label={`New ${what} name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              form.clearFieldError('name');
            }}
            error={form.fieldErrors.name}
          />
        </div>
        {withCode && (
          <div className="w-36">
            <Input
              label="GST state code"
              inputMode="numeric"
              maxLength={2}
              placeholder="e.g. 27"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                form.clearFieldError('gstStateCode');
              }}
              error={form.fieldErrors.gstStateCode}
            />
          </div>
        )}
      </div>
      {form.formError && (
        <p role="alert" className="mt-2 text-sm text-danger-500">
          {form.formError}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          loading={form.submitting}
          onClick={() => void form.submit((key) => onAdd(key, name, withCode ? code : undefined))}
        >
          Add {what}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
