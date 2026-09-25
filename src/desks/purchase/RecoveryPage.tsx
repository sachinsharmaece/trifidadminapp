import { useCallback, useState } from 'react';
import {
  getInspectionsPendingApply,
  postApplyInspection,
  getReturnNoteAgeing,
  getOpenSellerDebits,
  getSellerRecoveryQueue,
  type InspectionPendingApplyItem,
  type ReturnNoteAgeingItem,
  type OpenSellerDebitItem,
} from '../../api/purchase';
import { ApiError } from '../../api/errors';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { DevNote } from '../../components/dev/DevNote';

export function RecoveryPage() {
  return (
    <div className="flex flex-col gap-6">
      <DevNote screen="purchase_recovery" />
      <p className="text-sm text-slate-500">
        Three things that leak money quietly. The dock records, Purchase applies (BR-190).
      </p>
      <InspectionsSection />
      <ReturnNotesSection />
      <DebitsSection />
      <SellerRecoverySection />
    </div>
  );
}

function InspectionsSection() {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getInspectionsPendingApply(token)),
    [callApi],
  );
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card title="Dock findings to apply">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing waiting.">
        {(items: InspectionPendingApplyItem[]) => (
          <>
            {error && <p className="mb-3 text-sm text-danger-500">{error}</p>}
            <Table>
              <thead>
                <tr>
                  <Th>PO</Th>
                  <Th>Seller</Th>
                  <Th>Accepted</Th>
                  <Th>Rejected</Th>
                  <Th>Reasons</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.inspectionId}>
                    <Td className="font-mono">{i.poNo}</Td>
                    <Td className="font-mono text-xs">{i.sellerId.slice(-6)}</Td>
                    <Td>{i.casesAccepted}</Td>
                    <Td>
                      {i.casesRejected ? (
                        <span className="text-danger-500">{i.casesRejected}</span>
                      ) : (
                        0
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500">
                      {i.reasons.join(', ') || '—'}
                      {i.wholeLot && (
                        <div>
                          <Badge tone="bad">whole lot</Badge>
                        </div>
                      )}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        onClick={() =>
                          void callApi((token) => postApplyInspection(token, i.poId))
                            .then(retry)
                            .catch((e) =>
                              setError(e instanceof ApiError ? e.message : 'Could not apply.'),
                            )
                        }
                      >
                        Apply
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function ReturnNotesSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getReturnNoteAgeing(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Return notes — ageing (BR-189)">
      <p className="mb-4 text-sm text-slate-500">
        30-day clock. Disposal of unusable insecticide is a regulated procedure, not an accounting
        entry.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing outstanding.">
        {(items: ReturnNoteAgeingItem[]) => (
          <Table>
            <thead>
              <tr>
                <Th>PO</Th>
                <Th>Cases</Th>
                <Th>Days old</Th>
                <Th>Overdue</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.returnNoteId}>
                  <Td className="font-mono">{item.poId.slice(-6)}</Td>
                  <Td>{item.cases}</Td>
                  <Td>{item.daysOld}</Td>
                  <Td>{item.overdue && <Badge tone="bad">Past 30 days</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function DebitsSection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getOpenSellerDebits(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Debits">
      <p className="mb-4 text-sm text-slate-500">
        What we paid on a seller&apos;s behalf, netted at his next payout — a receivable, not a
        write-off.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing open.">
        {(items: OpenSellerDebitItem[]) => (
          <Table>
            <thead>
              <tr>
                <Th>Seller</Th>
                <Th>Reason</Th>
                <Th>Amount</Th>
                <Th>Raised</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.debitId}>
                  <Td className="font-mono text-xs">{d.sellerId.slice(-6)}</Td>
                  <Td>{d.reason}</Td>
                  <Td>₹{(d.amountPaise / 100).toFixed(2)}</Td>
                  <Td>{new Date(d.raisedAt).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}

// Kept from the pre-v2 desk — BR-206's other half of a Controller-decided dispute.
function SellerRecoverySection() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getSellerRecoveryQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);

  return (
    <Card title="Seller recovery — Controller-decided disputes (BR-206)">
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing to recover.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Seller</Th>
                <Th>Debit note</Th>
                <Th>Decided</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.complaintId}>
                  <Td className="font-mono text-xs">{item.sellerId.slice(-6)}</Td>
                  <Td className="font-mono text-xs">
                    {item.debitNoteId ? item.debitNoteId.slice(-6) : '—'}
                  </Td>
                  <Td>{item.decidedAt ? new Date(item.decidedAt).toLocaleDateString() : '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
