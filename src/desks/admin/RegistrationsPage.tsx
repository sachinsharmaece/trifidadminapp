import { useCallback, useState } from 'react';
import type { FormEvent } from 'react';
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
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import type { RegistrationListItem, RegistrationStatusDto, TehsilDto } from '../../api/dto';

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
    <main>
      <h1>Registrations</h1>

      <label htmlFor="stage">Stage</label>
      <select id="stage" value={stage} onChange={(e) => setStage(e.target.value)}>
        <option value="pending">Pending</option>
        <option value="active">Active</option>
        <option value="rejected">Rejected</option>
      </select>

      <AsyncBoundary state={list.state} onRetry={list.retry} emptyMessage="Nothing in this stage.">
        {(items: RegistrationListItem[]) => (
          <table>
            <thead>
              <tr>
                <th>Firm</th>
                <th>GSTIN</th>
                <th>Kind</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.registrationId}>
                  <td>{item.firm}</td>
                  <td>{item.gstin}</td>
                  <td>{item.kind}</td>
                  <td>{item.status}</td>
                  <td>
                    <button type="button" onClick={() => setSelectedId(item.registrationId)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncBoundary>

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
    </main>
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
    <section className="detail-panel">
      <h2>Registration detail</h2>
      <AsyncBoundary state={state} onRetry={retry}>
        {(registration: RegistrationStatusDto) => (
          <>
            <p>
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
          </>
        )}
      </AsyncBoundary>
    </section>
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
    <form onSubmit={handleSubmit}>
      <h3>Approve buyer</h3>
      <label htmlFor="ab-tehsil">
        Tehsil (BR-081 — required; the resolver cannot work without it)
      </label>
      <select
        id="ab-tehsil"
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
      </select>

      <label htmlFor="ab-position">Trade position</label>
      <select
        id="ab-position"
        value={tradePosition}
        onChange={(e) => setTradePosition(e.target.value as typeof tradePosition)}
      >
        <option value="distributor">Distributor</option>
        <option value="dealer">Dealer</option>
        <option value="retailer">Retailer</option>
      </select>

      <label className="checkbox-row">
        <input type="checkbox" checked={isTrader} onChange={(e) => setIsTrader(e.target.checked)} />
        Is trader
      </label>

      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting || !tehsilId}>
        Approve
      </button>
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
    <form onSubmit={handleSubmit}>
      <h3>Approve seller</h3>
      <fieldset>
        <legend>Area (BR-083 — required; no area, no listing)</legend>
        {tehsils.map((tehsil) => (
          <label key={tehsil.tehsilId} className="checkbox-row">
            <input
              type="checkbox"
              checked={tehsilIds.includes(tehsil.tehsilId)}
              onChange={() => toggle(tehsil.tehsilId)}
            />
            {tehsil.name} ({tehsil.district})
          </label>
        ))}
      </fieldset>

      <label htmlFor="as-cutoff">Dispatch cut-off time</label>
      <input
        id="as-cutoff"
        type="time"
        value={dispatchCutoffTime}
        onChange={(e) => setDispatchCutoffTime(e.target.value)}
        required
      />

      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting || tehsilIds.length === 0}>
        Approve
      </button>
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
    <form onSubmit={handleSubmit}>
      <h3>Reject</h3>
      <label htmlFor="reject-reason">Reason</label>
      <textarea
        id="reject-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
      />
      {error && (
        <p className="note-urgent" role="alert">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting || !reason}>
        Reject
      </button>
    </form>
  );
}
