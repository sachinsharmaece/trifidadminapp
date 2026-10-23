import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheck, FiX } from 'react-icons/fi';
import {
  approveBuyer,
  approveSeller,
  getRegistration,
  getRegistrationBuyerProfile,
  getRegistrationSellerProfile,
  type SellerProfileDto,
  listRegistrations,
  rejectRegistration,
  type BuyerCategory,
} from '../../api/onboarding';
import { newIdempotencyKey } from '../../lib/idempotency';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { PERMISSIONS } from '../../lib/permissions';
import { LocationBlock, type LocationValue } from '../../components/location/LocationBlock';
import { AssigneeSelect, CategorySelect } from '../../components/buyer/BuyerFields';
import type { BuyerProfileDto } from '../../api/dto';
import { getTehsils } from '../../api/territory';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { DevNote } from '../../components/dev/DevNote';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Input';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import type { RegistrationListItem, RegistrationStatusDto, TehsilDto } from '../../api/dto';

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: 'warn',
  active: 'good',
  rejected: 'bad',
};

export function RegistrationsPage() {
  const { callApi } = useAuth();
  const [stage, setStage] = useState('pending');
  // B-24 — a duplicate-registration error links here with the existing
  // record's id (`?open=<id>`) so staff land straight on it, rather than
  // being told a duplicate exists with nowhere to go look at it.
  const [searchParams] = useSearchParams();
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get('open'));

  const listLoader = useCallback(
    () => callApi((token) => listRegistrations(token, stage)),
    [callApi, stage],
  );
  const list = useAsyncData(listLoader, (items) => items.length === 0, [listLoader]);

  const tehsilsLoader = useCallback(() => callApi((token) => getTehsils(token)), [callApi]);
  const tehsils = useAsyncData(tehsilsLoader, (items) => items.length === 0, [tehsilsLoader]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Registrations</h1>
      </div>
      <DevNote screen="admin_registrations" />

      <Card>
        <div className="mb-4 max-w-xs">
          <Select id="stage" label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="rejected">Rejected</option>
          </Select>
        </div>

        <AsyncBoundary
          state={list.state}
          onRetry={list.retry}
          emptyMessage="Nothing in this stage."
        >
          {(items: RegistrationListItem[]) => (
            <Table>
              <thead>
                <tr>
                  <Th>Firm</Th>
                  <Th>GSTIN / PAN</Th>
                  <Th>Kind</Th>
                  <Th>Assigned to</Th>
                  <Th>District</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.registrationId}>
                    <Td>{item.firm}</Td>
                    <Td>{item.gstin ?? (item.pan ? `Unregistered · PAN ${item.pan}` : '—')}</Td>
                    <Td className="capitalize">{item.kind}</Td>
                    <Td>{item.kind === 'seller' ? '—' : (item.assignedTo ?? 'Queue')}</Td>
                    <Td>{item.district ?? '—'}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Badge tone={STATUS_TONE[item.status] ?? 'neutral'}>{item.status}</Badge>
                        {item.staffAssisted && <Badge tone="neutral">staff-assisted</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedId(item.registrationId)}
                      >
                        Open
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </AsyncBoundary>
      </Card>

      {selectedId && (
        <RegistrationDetail
          registrationId={selectedId}
          tehsils={tehsils.state.status === 'success' ? tehsils.state.data : []}
          onDecided={() => {
            setSelectedId(null);
            list.retry();
          }}
        />
      )}
    </div>
  );
}

function RegistrationDetail({
  registrationId,
  tehsils,
  onDecided,
}: {
  registrationId: string;
  tehsils: TehsilDto[];
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getRegistration(token, registrationId)),
    [callApi, registrationId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <Card title="Registration detail">
      <AsyncBoundary state={state} onRetry={retry}>
        {(registration: RegistrationStatusDto) => {
          return (
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {registration.firm || '(no firm name on file)'}
                </p>
                <p className="font-mono text-sm text-slate-500">
                  {registration.gstin || '(no GSTIN on file)'}
                </p>
              </div>
              <p className="text-sm text-slate-700">
                Status: <strong>{registration.status}</strong>
                {registration.rejectionReason ? ` — ${registration.rejectionReason}` : ''}
              </p>
              {registration.staffAssisted && (
                <p className="text-sm text-slate-600">
                  Added by staff on a call — the proprietor agreed to register this number (no OTP
                  is waited for).
                </p>
              )}
              {registration.status === 'pending' &&
                (registration.kind === 'seller' ? (
                  <ApproveSellerForm
                    registrationId={registrationId}
                    tehsils={tehsils}
                    onDecided={onDecided}
                  />
                ) : (
                  <ApproveBuyerForm registrationId={registrationId} onDecided={onDecided} />
                ))}
              {registration.status === 'pending' && (
                <RejectForm registrationId={registrationId} onDecided={onDecided} />
              )}
            </div>
          );
        }}
      </AsyncBoundary>
    </Card>
  );
}

/**
 * Phase 3 — approve a buyer. Prefilled from his registration (category,
 * location, Assigned to); the approver can change any of them. Only a Sales
 * Leader (for his team or the Queue) or Admin may approve — everyone else
 * sees the details read-only. No "Is trader" tick: the category is the
 * margin column (DEC-058).
 */
function ApproveBuyerForm({
  registrationId,
  onDecided,
}: {
  registrationId: string;
  onDecided: () => void;
}) {
  const { callApi, hasPermission } = useAuth();
  const canApprove = hasPermission(PERMISSIONS.BUYER_APPROVE);
  const loader = useCallback(
    () => callApi((token) => getRegistrationBuyerProfile(token, registrationId)),
    [callApi, registrationId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);
  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(profile: BuyerProfileDto) => (
        <ApproveBuyerFields
          key={profile.buyerId}
          profile={profile}
          registrationId={registrationId}
          canApprove={canApprove}
          onDecided={onDecided}
        />
      )}
    </AsyncBoundary>
  );
}

function ApproveBuyerFields({
  profile,
  registrationId,
  canApprove,
  onDecided,
}: {
  profile: BuyerProfileDto;
  registrationId: string;
  canApprove: boolean;
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [category, setCategory] = useState<BuyerCategory | ''>(profile.category ?? '');
  const [location, setLocation] = useState<LocationValue>({
    address: profile.location.address ?? '',
    pincode: profile.location.pincode ?? '',
    stateId: profile.location.stateId ?? '',
    districtId: profile.location.districtId ?? '',
    tehsilId: profile.location.tehsilId ?? '',
  });
  const [assignedTo, setAssignedTo] = useState(profile.assignedTo?.employeeId ?? '');
  const save = useFormSubmit<unknown>({
    toastOnSuccess: true,
    fields: [
      'category',
      'assignedToEmployeeId',
      'location.address',
      'location.pincode',
      'location.stateId',
      'location.districtId',
      'location.tehsilId',
    ],
    success: 'Buyer approved.',
    onSuccess: onDecided,
  });
  const e = save.fieldErrors;

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void save.submit((key) =>
      callApi((token) =>
        approveBuyer(
          token,
          registrationId,
          {
            category: category as BuyerCategory,
            location: {
              address: location.address,
              pincode: location.pincode || undefined,
              stateId: location.stateId,
              districtId: location.districtId,
              tehsilId: location.tehsilId,
            },
            assignedToEmployeeId: assignedTo,
          },
          key,
        ),
      ),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex max-w-2xl flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Approve buyer</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <dt className="text-slate-500">Proprietor</dt>
        <dd>{profile.ownerName ?? '—'}</dd>
        <dt className="text-slate-500">Mobile</dt>
        <dd>
          {profile.contactMobile ?? '—'}
          {!profile.loginMobile && profile.contactMobile ? ' (shared — no app login)' : ''}
        </dd>
        <dt className="text-slate-500">GSTIN</dt>
        <dd>{profile.gstin ?? `Unregistered · PAN ${profile.pan ?? '—'}`}</dd>
        <dt className="text-slate-500">Leader</dt>
        <dd>{profile.assignedLeader?.person ?? '—'}</dd>
      </dl>
      {!canApprove && (
        <p className="text-sm text-slate-600">
          Only the Sales Leader of this buyer’s team, or Admin, can approve him.
        </p>
      )}
      <fieldset disabled={!canApprove} className="flex flex-col gap-4">
        <CategorySelect
          value={category}
          onChange={(v) => {
            setCategory(v);
            save.clearFieldError('category');
          }}
          error={e.category}
        />
        <LocationBlock
          required
          value={location}
          onChange={setLocation}
          errors={{
            address: e['location.address'],
            pincode: e['location.pincode'],
            stateId: e['location.stateId'],
            districtId: e['location.districtId'],
            tehsilId: e['location.tehsilId'],
          }}
        />
        <AssigneeSelect
          required
          allowQueue={false}
          current={profile.assignedTo}
          value={assignedTo}
          onChange={(v) => {
            setAssignedTo(v);
            save.clearFieldError('assignedToEmployeeId');
          }}
          error={e.assignedToEmployeeId}
        />
      </fieldset>
      {save.formError && (
        <p role="alert" className="text-sm text-danger-500">
          {save.formError}
        </p>
      )}
      {canApprove && (
        <Button
          type="submit"
          loading={save.submitting}
          disabled={!category || !location.tehsilId || !assignedTo}
          icon={<FiCheck />}
        >
          Approve
        </Button>
      )}
    </form>
  );
}

/**
 * Phase 4 — approve a seller. A Purchase Leader (for his team or the Queue)
 * or Admin; everyone else sees it read-only. Prefilled with his own location
 * and Assigned to; the area he supplies (BR-083 — no area, no listing) and
 * his dispatch cut-off are set here as before.
 */
function ApproveSellerForm({
  registrationId,
  tehsils,
  onDecided,
}: {
  registrationId: string;
  tehsils: TehsilDto[];
  onDecided: () => void;
}) {
  const { callApi, hasPermission } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getRegistrationSellerProfile(token, registrationId)),
    [callApi, registrationId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);
  return (
    <AsyncBoundary state={state} onRetry={retry}>
      {(profile: SellerProfileDto) => (
        <ApproveSellerFields
          key={profile.sellerId}
          profile={profile}
          registrationId={registrationId}
          tehsils={tehsils}
          canApprove={hasPermission(PERMISSIONS.SELLER_APPROVE)}
          onDecided={onDecided}
        />
      )}
    </AsyncBoundary>
  );
}

function ApproveSellerFields({
  profile,
  registrationId,
  tehsils,
  canApprove,
  onDecided,
}: {
  profile: SellerProfileDto;
  registrationId: string;
  tehsils: TehsilDto[];
  canApprove: boolean;
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [tehsilIds, setTehsilIds] = useState<string[]>([]);
  const [dispatchCutoffTime, setDispatchCutoffTime] = useState('16:00');
  const [location, setLocation] = useState<LocationValue>({
    address: profile.location.address ?? '',
    pincode: profile.location.pincode ?? '',
    stateId: profile.location.stateId ?? '',
    districtId: profile.location.districtId ?? '',
    tehsilId: profile.location.tehsilId ?? '',
  });
  const [assignedTo, setAssignedTo] = useState(profile.assignedTo?.employeeId ?? '');
  const save = useFormSubmit<unknown>({
    toastOnSuccess: true,
    fields: [
      'tehsilIds',
      'dispatchCutoffTime',
      'assignedToEmployeeId',
      'location.address',
      'location.pincode',
      'location.stateId',
      'location.districtId',
      'location.tehsilId',
    ],
    success: 'Seller approved.',
    onSuccess: onDecided,
  });
  const e = save.fieldErrors;

  function toggle(id: string) {
    setTehsilIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void save.submit((key) =>
      callApi((token) =>
        approveSeller(
          token,
          registrationId,
          {
            tehsilIds,
            dispatchCutoffTime,
            ...(location.tehsilId
              ? {
                  location: {
                    address: location.address,
                    pincode: location.pincode || undefined,
                    stateId: location.stateId,
                    districtId: location.districtId,
                    tehsilId: location.tehsilId,
                  },
                }
              : {}),
            assignedToEmployeeId: assignedTo,
          },
          key,
        ),
      ),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex max-w-2xl flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Approve seller</h3>
      {!canApprove && (
        <p className="text-sm text-slate-600">
          Only the Purchase Leader of this seller’s team, or Admin, can approve him.
        </p>
      )}
      <fieldset disabled={!canApprove} className="flex flex-col gap-4">
        <p className="text-sm font-medium text-slate-700">His own place</p>
        <LocationBlock
          required
          value={location}
          onChange={setLocation}
          errors={{
            address: e['location.address'],
            pincode: e['location.pincode'],
            stateId: e['location.stateId'],
            districtId: e['location.districtId'],
            tehsilId: e['location.tehsilId'],
          }}
        />
        <AssigneeSelect
          side="purchase"
          required
          allowQueue={false}
          current={profile.assignedTo}
          value={assignedTo}
          onChange={(v) => {
            setAssignedTo(v);
            save.clearFieldError('assignedToEmployeeId');
          }}
          error={e.assignedToEmployeeId}
        />
        <fieldset className="rounded-md border border-slate-300 p-3">
          <legend className="px-1 text-sm font-medium text-slate-700">
            Area he supplies (BR-083 — required; no area, no listing)
          </legend>
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
            {tehsils.map((tehsil) => (
              <label
                key={tehsil.tehsilId}
                className="flex items-center gap-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={tehsilIds.includes(tehsil.tehsilId)}
                  onChange={() => toggle(tehsil.tehsilId)}
                />
                {tehsil.name} ({tehsil.district})
              </label>
            ))}
          </div>
          {e.tehsilIds && <p className="mt-1 text-sm text-danger-500">{e.tehsilIds}</p>}
        </fieldset>
        <Input
          label="Dispatch cut-off time"
          type="time"
          value={dispatchCutoffTime}
          onChange={(ev) => setDispatchCutoffTime(ev.target.value)}
          error={e.dispatchCutoffTime}
          required
        />
      </fieldset>
      {save.formError && (
        <p role="alert" className="text-sm text-danger-500">
          {save.formError}
        </p>
      )}
      {canApprove && (
        <Button
          type="submit"
          loading={save.submitting}
          disabled={tehsilIds.length === 0 || !assignedTo || !location.tehsilId}
          icon={<FiCheck />}
        >
          Approve
        </Button>
      )}
    </form>
  );
}

function RejectForm({
  registrationId,
  onDecided,
}: {
  registrationId: string;
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        rejectRegistration(token, registrationId, reason, newIdempotencyKey()),
      );
      onDecided();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not reject.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Reject</h3>
      <Textarea
        id="reject-reason"
        label="Reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <Button type="submit" variant="danger" loading={submitting} disabled={!reason} icon={<FiX />}>
        Reject
      </Button>
    </form>
  );
}
