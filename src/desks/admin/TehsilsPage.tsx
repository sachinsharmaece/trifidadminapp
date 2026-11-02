import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiEdit2, FiPlus } from 'react-icons/fi';
import { createTehsil, getTehsils, updateTehsil } from '../../api/territory';
import type { TehsilDto } from '../../api/dto';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { LocationPickers, type LocationPick } from '../../components/location/LocationPickers';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { PERMISSIONS } from '../../lib/permissions';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const NO_PICK: LocationPick = { stateId: '', districtId: '', tehsilId: '' };

/**
 * Manage → Tehsils (Phase 1). Every tehsil sits under a District, which sits
 * under a State. Admin and team leaders add and edit; everyone else reads.
 * A tehsil the location migration could not link yet shows "Not linked".
 */
export function TehsilsPage() {
  const { callApi, hasPermission } = useAuth();
  const canEdit = hasPermission(PERMISSIONS.LOCATION_MASTER_WRITE);
  const [filter, setFilter] = useState<LocationPick>(NO_PICK);
  const [editing, setEditing] = useState<TehsilDto | null>(null);

  const loader = useCallback(
    () =>
      callApi((token) =>
        getTehsils(token, filter.districtId ? { districtId: filter.districtId } : {}),
      ),
    [callApi, filter.districtId],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Tehsils</h1>
      <DevNote screen="admin_tehsils" />

      {canEdit && <AddTehsilCard onAdded={retry} />}

      <Card title="All tehsils">
        <div className="mb-4 grid max-w-2xl grid-cols-2 gap-4">
          <LocationPickers showTehsil={false} value={filter} onChange={setFilter} />
        </div>
        <p className="mb-4 text-sm text-slate-500">
          A tehsil name can repeat across districts (BR-080) — always pick it by its district.
        </p>
        <AsyncBoundary
          state={state}
          onRetry={retry}
          emptyMessage={filter.districtId ? 'No tehsils in this district yet.' : 'No tehsils yet.'}
        >
          {(items) => (
            <Table>
              <thead>
                <tr>
                  <Th>Tehsil</Th>
                  <Th>District</Th>
                  <Th>State</Th>
                  {canEdit && <Th>Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {items.map((tehsil) => (
                  <tr key={tehsil.tehsilId}>
                    <Td>{tehsil.name}</Td>
                    <Td>
                      {tehsil.district}{' '}
                      {!tehsil.districtId && (
                        <Badge tone="warn" variant="chip">
                          Not linked
                        </Badge>
                      )}
                    </Td>
                    <Td>{tehsil.state}</Td>
                    {canEdit && (
                      <Td>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<FiEdit2 />}
                          onClick={() => setEditing(tehsil)}
                        >
                          Edit
                        </Button>
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
        <EditTehsilModal
          tehsil={editing}
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

function AddTehsilCard({ onAdded }: { onAdded: () => void }) {
  const { callApi } = useAuth();
  const [pick, setPick] = useState<LocationPick>(NO_PICK);
  const [name, setName] = useState('');
  const form = useFormSubmit<{ tehsilId: string }>({
    fields: ['name', 'districtId'],
    success: 'Tehsil added.',
    onSuccess: () => {
      setName('');
      onAdded();
    },
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (!pick.districtId) return;
    void form.submit((key) =>
      callApi((token) => createTehsil(token, { name, districtId: pick.districtId }, key)),
    );
  }

  return (
    <Card title="Add a tehsil">
      <form onSubmit={handleSubmit} noValidate className="grid max-w-2xl grid-cols-2 gap-4">
        <LocationPickers
          showTehsil={false}
          required
          value={pick}
          onChange={setPick}
          errors={{ districtId: form.fieldErrors.districtId }}
        />
        <div className="col-span-2">
          <Input
            label="Tehsil name"
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              form.clearFieldError('name');
            }}
            error={form.fieldErrors.name}
          />
        </div>
        {form.formError && (
          <p role="alert" className="col-span-2 text-sm text-danger-500">
            {form.formError}
          </p>
        )}
        {form.successMessage && (
          <p className="col-span-2 text-sm text-success-600">{form.successMessage}</p>
        )}
        <div className="col-span-2">
          <Button
            type="submit"
            loading={form.submitting}
            disabled={!pick.districtId || !name.trim()}
            icon={<FiPlus />}
          >
            Add tehsil
          </Button>
        </div>
      </form>
    </Card>
  );
}

function EditTehsilModal({
  tehsil,
  onClose,
  onSaved,
}: {
  tehsil: TehsilDto;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { callApi } = useAuth();
  const [name, setName] = useState(tehsil.name);
  const [pick, setPick] = useState<LocationPick>({
    stateId: tehsil.stateId ?? '',
    districtId: tehsil.districtId ?? '',
    tehsilId: '',
  });
  const form = useFormSubmit<TehsilDto>({
    fields: ['name', 'districtId'],
    success: 'Tehsil saved.',
    onSuccess: onSaved,
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void form.submit((key) =>
      callApi((token) =>
        updateTehsil(
          token,
          tehsil.tehsilId,
          {
            ...(name.trim() !== tehsil.name ? { name } : {}),
            ...(pick.districtId && pick.districtId !== tehsil.districtId
              ? { districtId: pick.districtId }
              : {}),
          },
          key,
        ),
      ),
    );
  }

  const unchanged =
    name.trim() === tehsil.name && (pick.districtId || null) === (tehsil.districtId ?? null);

  return (
    <Modal open title={`Edit ${tehsil.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {!tehsil.districtId && (
          <p className="text-sm text-slate-600">
            Not linked yet — it reads “{tehsil.district}, {tehsil.state}”. Pick its district to link
            it.
          </p>
        )}
        <Input
          label="Tehsil name"
          required
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            form.clearFieldError('name');
          }}
          error={form.fieldErrors.name}
        />
        <LocationPickers
          showTehsil={false}
          required
          value={pick}
          onChange={setPick}
          errors={{ districtId: form.fieldErrors.districtId }}
        />
        {form.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {form.formError}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={form.submitting} disabled={unchanged || !pick.districtId}>
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
