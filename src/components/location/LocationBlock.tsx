import { useCallback, useEffect, useRef, useState } from 'react';
import { lookupPincode } from '../../api/territory';
import type { PincodeLocationDto } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { isValidPincode } from '../../lib/validators';
import { Input, Textarea } from '../ui/Input';
import { LocationPickers, type LocationPick } from './LocationPickers';

export interface LocationValue extends LocationPick {
  address: string;
  pincode: string;
}

export const EMPTY_LOCATION: LocationValue = {
  address: '',
  pincode: '',
  stateId: '',
  districtId: '',
  tehsilId: '',
};

export type LocationErrors = Partial<Record<keyof LocationValue, string>>;

/**
 * The one location section every buyer and seller form uses (Phase 1):
 * Address, Pincode, then State → District → Tehsil.
 *
 * - A **known pincode** fills State, District and Tehsil in. They stay
 *   editable; picking something else only changes this record — the
 *   pincode master is never edited from a form — and a note says so.
 * - An **unknown pincode**: the staff member picks the tehsil, and when the
 *   form is saved the server stores pincode → tehsil as *unverified* for an
 *   Admin to check on Manage › Pincodes.
 *
 * Errors use the field names the server sends (`address`, `pincode`,
 * `stateId`, `districtId`, `tehsilId`) so a form can pass the form kit's
 * `fieldErrors` straight through.
 */
export function LocationBlock({
  value,
  onChange,
  errors = {},
  required = false,
  addressLabel = 'Address',
}: {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  errors?: LocationErrors;
  required?: boolean;
  addressLabel?: string;
}) {
  const { callApi } = useAuth();
  const [known, setKnown] = useState<PincodeLocationDto | null>(null);
  const [lookup, setLookup] = useState<'idle' | 'looking' | 'known' | 'unknown' | 'failed'>('idle');
  const valueRef = useRef(value);
  valueRef.current = value;

  const runLookup = useCallback(
    async (pincode: string) => {
      setLookup('looking');
      try {
        const found = await callApi((token) => lookupPincode(token, pincode));
        // The pincode may have changed while the lookup was in flight.
        if (valueRef.current.pincode !== pincode) return;
        setKnown(found);
        setLookup(found ? 'known' : 'unknown');
        if (found && found.stateId && found.districtId) {
          onChange({
            ...valueRef.current,
            stateId: found.stateId,
            districtId: found.districtId,
            tehsilId: found.tehsilId,
          });
        }
      } catch {
        if (valueRef.current.pincode === pincode) setLookup('failed');
      }
    },
    [callApi, onChange],
  );

  useEffect(() => {
    if (isValidPincode(value.pincode)) {
      void runLookup(value.pincode);
    } else {
      setKnown(null);
      setLookup('idle');
    }
    // Only a new pincode triggers a lookup — not every keystroke elsewhere,
    // so `runLookup` is deliberately left out of the deps.
  }, [value.pincode]);

  const differsFromMaster =
    lookup === 'known' && known && value.tehsilId && value.tehsilId !== known.tehsilId;

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        label={addressLabel}
        required={required}
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        error={errors.address}
      />
      <div>
        <Input
          label="Pincode"
          required={required}
          inputMode="numeric"
          maxLength={6}
          placeholder="6 digits"
          value={value.pincode}
          onChange={(e) =>
            onChange({ ...value, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })
          }
          error={
            errors.pincode ??
            (value.pincode.length === 6 && !isValidPincode(value.pincode)
              ? 'A pincode never starts with 0.'
              : undefined)
          }
        />
        {lookup === 'looking' && (
          <p className="mt-1 text-xs text-slate-500">Looking up this pincode…</p>
        )}
        {lookup === 'known' && known && (
          <p className="mt-1 text-xs text-slate-600">
            {known.tehsilName}, {known.districtName}, {known.stateName}
            {known.status === 'unverified' ? ' (not yet verified by an admin)' : ''} — filled in
            below.
          </p>
        )}
        {lookup === 'unknown' && (
          <p className="mt-1 text-xs text-warning-600">
            New pincode — pick the tehsil below. It is saved with this record for an admin to
            verify.
          </p>
        )}
        {lookup === 'failed' && (
          <p className="mt-1 text-xs text-slate-500">
            Could not look this pincode up — pick the tehsil below.
          </p>
        )}
      </div>
      <LocationPickers
        required={required}
        value={{ stateId: value.stateId, districtId: value.districtId, tehsilId: value.tehsilId }}
        onChange={(pick) => onChange({ ...value, ...pick })}
        errors={{
          stateId: errors.stateId,
          districtId: errors.districtId,
          tehsilId: errors.tehsilId,
        }}
      />
      {differsFromMaster && known && (
        <p className="text-xs text-slate-600">
          Note: pincode {known.pincode} is listed under {known.tehsilName}, {known.districtName}.
          Your choice is saved on this record only; the pincode list is not changed.
        </p>
      )}
    </div>
  );
}
