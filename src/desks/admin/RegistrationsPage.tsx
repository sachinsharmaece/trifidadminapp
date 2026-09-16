import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import {
  approveBuyer,
  approveSeller,
  getRegistration,
  listRegistrations,
  rejectRegistration,
} from '../../api/onboarding';
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
                  <Th>GSTIN</Th>
                  <Th>Kind</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.registrationId}>
                    <Td>{item.firm}</Td>
                    <Td>{item.gstin}</Td>
                    <Td className="capitalize">{item.kind}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[item.status] ?? 'neutral'}>{item.status}</Badge>
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
        {(registration: RegistrationStatusDto) => (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-700">
              Status: <strong>{registration.status}</strong>
              {registration.rejectionReason ? ` — ${registration.rejectionReason}` : ''}
            </p>
            {registration.status === 'pending' &&
              (registration.kind === 'seller' ? (
                <ApproveSellerForm
                  registrationId={registrationId}
                  tehsils={tehsils}
                  onDecided={onDecided}
                />
              ) : (
                <ApproveBuyerForm
                  registrationId={registrationId}
                  tehsils={tehsils}
                  onDecided={onDecided}
                />
              ))}
            {registration.status === 'pending' && (
              <RejectForm registrationId={registrationId} onDecided={onDecided} />
            )}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function ApproveBuyerForm({
  registrationId,
  tehsils,
  onDecided,
}: {
  registrationId: string;
  tehsils: TehsilDto[];
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [tehsilId, setTehsilId] = useState('');
  const [tradePosition, setTradePosition] = useState<'distributor' | 'dealer' | 'retailer'>(
    'dealer',
  );
  const [isTrader, setIsTrader] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        approveBuyer(token, registrationId, { tehsilId, tradePosition, isTrader }),
      );
      onDecided();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not approve.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Approve buyer</h3>
      <Select
        id="ab-tehsil"
        label="Tehsil"
        hint="BR-081 — required; the resolver cannot work without it"
        value={tehsilId}
        onChange={(e) => setTehsilId(e.target.value)}
        required
      >
        <option value="">Select…</option>
        {tehsils.map((tehsil) => (
          <option key={tehsil.tehsilId} value={tehsil.tehsilId}>
            {tehsil.name} ({tehsil.district})
          </option>
        ))}
      </Select>

      <Select
        id="ab-position"
        label="Trade position"
        value={tradePosition}
        onChange={(e) => setTradePosition(e.target.value as typeof tradePosition)}
      >
        <option value="distributor">Distributor</option>
        <option value="dealer">Dealer</option>
        <option value="retailer">Retailer</option>
      </Select>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300"
          checked={isTrader}
          onChange={(e) => setIsTrader(e.target.checked)}
        />
        Is trader
      </label>

      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <Button type="submit" loading={submitting} disabled={!tehsilId} icon={<FiCheck />}>
        Approve
      </Button>
    </form>
  );
}

function ApproveSellerForm({
  registrationId,
  tehsils,
  onDecided,
}: {
  registrationId: string;
  tehsils: TehsilDto[];
  onDecided: () => void;
}) {
  const { callApi } = useAuth();
  const [tehsilIds, setTehsilIds] = useState<string[]>([]);
  const [dispatchCutoffTime, setDispatchCutoffTime] = useState('16:00');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setTehsilIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id],
    );
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        approveSeller(token, registrationId, { tehsilIds, dispatchCutoffTime }),
      );
      onDecided();
    } catch (submitError) {
      setError(submitError instanceof ApiError ? submitError.message : 'Could not approve.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-md flex-col gap-4 rounded-md border border-slate-200 p-4"
    >
      <h3 className="text-sm font-semibold text-slate-900">Approve seller</h3>
      <fieldset className="rounded-md border border-slate-300 p-3">
        <legend className="px-1 text-sm font-medium text-slate-700">
          Area (BR-083 — required; no area, no listing)
        </legend>
        <div className="flex flex-col gap-2">
          {tehsils.map((tehsil) => (
            <label key={tehsil.tehsilId} className="flex items-center gap-2 text-sm text-slate-700">
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
      </fieldset>

      <Input
        id="as-cutoff"
        label="Dispatch cut-off time"
        type="time"
        value={dispatchCutoffTime}
        onChange={(e) => setDispatchCutoffTime(e.target.value)}
        required
      />

      {error && (
        <p role="alert" className="text-sm text-danger-500">
          {error}
        </p>
      )}
      <Button
        type="submit"
        loading={submitting}
        disabled={tehsilIds.length === 0}
        icon={<FiCheck />}
      >
        Approve
      </Button>
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
      await callApi((token) => rejectRegistration(token, registrationId, reason));
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
