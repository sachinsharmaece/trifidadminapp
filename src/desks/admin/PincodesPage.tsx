import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheck, FiEdit2 } from 'react-icons/fi';
import { getPincodes, updatePincode } from '../../api/territory';
import type { PincodeListItemDto } from '../../api/dto';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { LocationPickers, type LocationPick } from '../../components/location/LocationPickers';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { formatDate } from '../../lib/dates';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Input';
import { Table, Th, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';

type StatusFilter = 'unverified' | 'verified' | 'all';

/**
 * Manage → Pincodes (Phase 1). A pincode staff typed that the master had
 * never seen is saved against the tehsil they picked, as *unverified*. An
 * Admin checks each one here: corrects the tehsil if it is wrong, then
 * verifies it. Pincodes are stored only — listing reach stays tehsil-based.
 */
export function PincodesPage() {
  const { callApi, hasPermission } = useAuth();
  const { show } = useToast();
  const canVerify = hasPermission(PERMISSIONS.PINCODE_VERIFY);
  const [status, setStatus] = useState<StatusFilter>('unverified');
  const [editing, setEditing] = useState<PincodeListItemDto | null>(null);
  const loader = useCallback(
    () => callApi((token) => getPincodes(token, status === 'all' ? undefined : status)),
    [callApi, status],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  const verify = useFormSubmit<unknown>({
    success: 'Pincode verified.',
    onSuccess: () => {
      show('Pincode verified.');
      retry();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Pincodes</h1>
      <Card>
        <div className="mb-4 w-56">
          <Select
            label="Show"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="unverified">Unverified</option>
            <option value="verified">Verified</option>
            <option value="all">All</option>
          </Select>
        </div>
        {verify.formError && (
          <p role="alert" className="mb-3 text-sm text-danger-500">
            {verify.formError}
          </p>
        )}
        <AsyncBoundary
          state={state}
          onRetry={retry}
          emptyMessage={
            status === 'unverified'
              ? 'Nothing waiting — every pincode is verified.'
              : 'No pincodes yet.'
          }
        >
          {(items) => (
            <Table>
              <thead>
                <tr>
                  <Th>Pincode</Th>
                  <Th>Tehsil</Th>
                  <Th>District</Th>
                  <Th>State</Th>
                  <Th>Status</Th>
                  <Th>Added</Th>
                  {canVerify && <Th>Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.pincode}>
                    <Td>{row.pincode}</Td>
                    <Td>{row.tehsilName}</Td>
                    <Td>{row.districtName}</Td>
                    <Td>{row.stateName}</Td>
                    <Td>
                      <Badge tone={row.status === 'verified' ? 'good' : 'warn'}>
                        {row.status === 'verified' ? 'Verified' : 'Unverified'}
                      </Badge>
                    </Td>
                    <Td>
                      {formatDate(row.createdAt)}
                      {row.createdByName ? ` · ${row.createdByName}` : ''}
                    </Td>
                    {canVerify && (
                      <Td>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<FiEdit2 />}
                            onClick={() => setEditing(row)}
                          >
                            Change tehsil
                          </Button>
                          {row.status === 'unverified' && (
                            <Button
                              size="sm"
                              icon={<FiCheck />}
                              loading={verify.submitting}
                              onClick={() =>
                                void verify.submit((key) =>
                                  callApi((token) =>
                                    updatePincode(token, row.pincode, { verify: true }, key),
                                  ),
                                )
                              }
                            >
                              Verify
                            </Button>
                          )}
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>

      {editing && (
        <ChangeTehsilModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            retry();
          }}
        />
      )}
    </div>
  );
}

function ChangeTehsilModal({
  row,
  onClose,
  onSaved,
}: {
  row: PincodeListItemDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { callApi } = useAuth();
  const [pick, setPick] = useState<LocationPick>({
    stateId: row.stateId ?? '',
    districtId: row.districtId ?? '',
    tehsilId: row.tehsilId,
  });
  const [alsoVerify, setAlsoVerify] = useState(row.status === 'unverified');
  const form = useFormSubmit<unknown>({
    fields: ['tehsilId'],
    success: 'Saved.',
    onSuccess: onSaved,
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void form.submit((key) =>
      callApi((token) =>
        updatePincode(
          token,
          row.pincode,
          { tehsilId: pick.tehsilId, ...(alsoVerify ? { verify: true as const } : {}) },
          key,
        ),
      ),
    );
  }

  return (
    <Modal open title={`Pincode ${row.pincode}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <LocationPickers
          required
          value={pick}
          onChange={setPick}
          errors={{ tehsilId: form.fieldErrors.tehsilId }}
        />
        {row.status === 'unverified' && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={alsoVerify}
              onChange={(e) => setAlsoVerify(e.target.checked)}
            />
            Also mark it verified
          </label>
        )}
        {form.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {form.formError}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={form.submitting} disabled={!pick.tehsilId}>
            Save
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
