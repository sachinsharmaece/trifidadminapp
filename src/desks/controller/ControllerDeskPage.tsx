import { useCallback, useState } from 'react';
import { FiAlertTriangle, FiCheck, FiZap } from 'react-icons/fi';
import {
  decideDispute,
  getDisputeQueue,
  getExceptionView,
  grantBulkLifeline,
} from '../../api/controller';
import { useAuth } from '../../auth/AuthContext';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Input, Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

/**
 * New — M7. The Controller surface in full: the cross-desk exception view
 * (MASTER_PLAN.md M7 DoD), dispute resolution (BR-206 — Controller decides;
 * Sales and Purchase each read the outcome for their own half), and the
 * bulk lifeline (BR-234). Bank repost already exists on the Accounts desk
 * (`repostBankEntry`) — not duplicated here.
 */
export function ControllerDeskPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Controller</h1>
      <ExceptionViewSection />
      <DisputeQueueSection />
      <BulkLifelineSection />
    </div>
  );
}

function ExceptionViewSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getExceptionView(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <Card title="Every exception, one place">
      <AsyncBoundary state={state} onRetry={retry}>
        {(v) => (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Open disputes" value={v.openDisputes} />
            <Stat
              label="Transit-damage (unhandled, QR-050)"
              value={v.unhandledTransitDamage}
              tone={v.unhandledTransitDamage > 0 ? 'warn' : undefined}
            />
            <Stat
              label="Return notes overdue"
              value={v.overdueReturnNotes}
              tone={v.overdueReturnNotes > 0 ? 'bad' : undefined}
            />
            <Stat
              label="Blacklisted w/ pending payables"
              value={v.blacklistedWithPendingPayables.length}
            />
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'bad' | 'warn' }) {
  const color =
    tone === 'bad' ? 'text-danger-600' : tone === 'warn' ? 'text-warning-600' : 'text-slate-900';
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function DisputeQueueSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getDisputeQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  return (
    <Card title="Dispute queue — Controller decides (BR-206)">
      <p className="mb-4 text-sm text-slate-500">
        Four of the five BR-201 categories land here; transit_damage never does this session (QR-050
        — see the exception view above).
      </p>
      <AsyncBoundary
        state={state}
        onRetry={retry}
        emptyMessage="No disputes waiting on a decision."
      >
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Category</Th>
                <Th>Note</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.complaintId}>
                  <Td>{item.soId.slice(-6)}</Td>
                  <Td>{item.category.replaceAll('_', ' ')}</Td>
                  <Td>{item.note ?? '—'}</Td>
                  <Td>
                    <Button variant="secondary" onClick={() => setDecidingId(item.complaintId)}>
                      Decide
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
      {decidingId && (
        <DecideDisputeForm
          complaintId={decidingId}
          onDone={() => {
            setDecidingId(null);
            retry();
          }}
          onCancel={() => setDecidingId(null)}
        />
      )}
    </Card>
  );
}

function DecideDisputeForm({
  complaintId,
  onDone,
  onCancel,
}: {
  complaintId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { callApi } = useAuth();
  const [disposition, setDisposition] = useState<'seller_fault' | 'dock_fault' | 'no_fault'>(
    'seller_fault',
  );
  const [note, setNote] = useState('');
  const [debitRupees, setDebitRupees] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      await callApi((token) =>
        decideDispute(token, complaintId, {
          disposition,
          note,
          debitValuePaise:
            disposition === 'seller_fault' ? Math.round(Number(debitRupees) * 100) : undefined,
        }),
      );
      onDone();
    } catch {
      setError('Could not record this decision.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 max-w-md rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-4">
        <Select
          id="dd-disposition"
          label="Disposition"
          value={disposition}
          onChange={(e) => setDisposition(e.target.value as typeof disposition)}
        >
          <option value="seller_fault">Seller fault — recover (BR-183)</option>
          <option value="dock_fault">Dock fault — TriFid bears it (BR-204/205)</option>
          <option value="no_fault">No fault — investigated, closed</option>
        </Select>
        {disposition === 'seller_fault' && (
          <Input
            id="dd-value"
            label="Recoverable value (₹)"
            type="number"
            step="0.01"
            value={debitRupees}
            onChange={(e) => setDebitRupees(e.target.value)}
          />
        )}
        <Input id="dd-note" label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            icon={<FiCheck />}
            loading={submitting}
            disabled={!note}
            onClick={() => void handleSubmit()}
          >
            Confirm decision
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function BulkLifelineSection() {
  const { callApi } = useAuth();
  const [extensionHours, setExtensionHours] = useState('24');
  const [reason, setReason] = useState('');
  const [checkerEmployeeId, setCheckerEmployeeId] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);
    setSubmitting(true);
    try {
      const r = await callApi((token) =>
        grantBulkLifeline(token, {
          extensionHours: Number(extensionHours),
          reason,
          checkerEmployeeId,
        }),
      );
      setResult(
        `${r.extendedPoCount} PO(s) extended to ${new Date(r.newDispatchDueDate).toLocaleString()}.`,
      );
    } catch {
      setError('Could not grant the lifeline.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card title="The bulk lifeline (BR-234)">
      <p className="mb-4 text-sm text-slate-500">
        Extends every currently open dispatch clock in one action, under one logged reason —
        maker-checker via a second employee ID, not this session&apos;s own re-authentication.
      </p>
      <div className="flex max-w-md flex-col gap-4">
        <Input
          id="bl-hours"
          label="Extension (hours)"
          type="number"
          value={extensionHours}
          onChange={(e) => setExtensionHours(e.target.value)}
        />
        <Input
          id="bl-reason"
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <Input
          id="bl-checker"
          label="Checker employee ID"
          value={checkerEmployeeId}
          onChange={(e) => setCheckerEmployeeId(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-danger-500">
            {error}
          </p>
        )}
        {result && (
          <p className="text-sm text-success-600">
            <FiAlertTriangle className="mr-1 inline" />
            {result}
          </p>
        )}
        <Button
          loading={submitting}
          disabled={!reason || !checkerEmployeeId}
          icon={<FiZap />}
          onClick={() => void handleSubmit()}
        >
          Grant to every open dispatch clock
        </Button>
      </div>
    </Card>
  );
}
