import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { FiSend } from 'react-icons/fi';
import { getPushStatus, pushToPurchase, type PushStatusDto } from '../../api/push';
import { getAssignablePurchasePeople } from '../../api/purchase';
import type { AssignableSalesPerson } from '../../api/dto';
import { useAuth } from '../../auth/AuthContext';
import { useAsyncData } from '../../lib/useAsyncData';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { AsyncBoundary } from '../AsyncBoundary';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select, Textarea } from '../ui/Input';

/**
 * Phase 6 — "Push to Purchase" on the buyer file: a buyer who can also
 * supply goes to the Sales Leader of his team, acting as that team's
 * purchase executive. The server says whether he can be pushed and why not
 * (already a seller, a push already open, not yet approved as a buyer).
 */
export function PushToPurchaseCard({ buyerId, firm }: { buyerId: string; firm: string }) {
  const { callApi } = useAuth();
  const loader = useCallback(
    () => callApi((token) => getPushStatus(token, buyerId)),
    [callApi, buyerId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);
  const [open, setOpen] = useState(false);

  return (
    <Card title="Push to Purchase">
      <AsyncBoundary state={state} onRetry={retry}>
        {(status: PushStatusDto) => (
          <div className="flex flex-col gap-2 text-sm">
            <p className="text-slate-500">
              He can also supply? Purchase sees only his firm details, who pushed him and your note
              — never his orders, rates or calls.
            </p>
            {status.alreadySeller ? (
              <p>
                Already a seller —{' '}
                <Link
                  className="text-brand-600 underline"
                  to={`/purchase/sellers/${status.alreadySeller.sellerId}`}
                >
                  {status.alreadySeller.firm || 'open'}
                </Link>
              </p>
            ) : status.openPush ? (
              <p>
                {status.openPush.status === 'pending'
                  ? 'Pushed — with '
                  : 'Waiting for approval — with '}
                {status.openPush.receiver ?? 'Purchase'}.
              </p>
            ) : (
              status.blockedReason && <p className="text-slate-600">{status.blockedReason}</p>
            )}
            <div>
              <Button
                size="sm"
                variant="secondary"
                icon={<FiSend />}
                disabled={!status.canPush}
                title={status.blockedReason ?? undefined}
                onClick={() => setOpen(true)}
              >
                Push to Purchase
              </Button>
            </div>
            {open && (
              <PushDialog
                buyerId={buyerId}
                firm={firm}
                status={status}
                onClose={() => setOpen(false)}
                onPushed={() => {
                  setOpen(false);
                  retry();
                }}
              />
            )}
          </div>
        )}
      </AsyncBoundary>
    </Card>
  );
}

function PushDialog({
  buyerId,
  firm,
  status,
  onClose,
  onPushed,
}: {
  buyerId: string;
  firm: string;
  status: PushStatusDto;
  onClose: () => void;
  onPushed: () => void;
}) {
  const { callApi } = useAuth();
  const [note, setNote] = useState('');
  const [receiver, setReceiver] = useState(status.receiver?.employeeId ?? '');
  const [people, setPeople] = useState<AssignableSalesPerson[]>([]);
  useEffect(() => {
    if (!status.canChooseReceiver) return;
    void callApi((token) => getAssignablePurchasePeople(token))
      .then(setPeople)
      .catch(() => setPeople([]));
  }, [callApi, status.canChooseReceiver]);
  const save = useFormSubmit<{ receiver: { person: string } }>({
    fields: ['note', 'receiverEmployeeId'],
    success: (result) => `${firm} pushed to ${result.receiver.person}.`,
    onSuccess: onPushed,
    toastOnSuccess: true,
  });

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void save.submit((key) =>
      callApi((token) =>
        pushToPurchase(
          token,
          buyerId,
          {
            note: note.trim(),
            ...(status.canChooseReceiver && receiver && receiver !== status.receiver?.employeeId
              ? { receiverEmployeeId: receiver }
              : {}),
          },
          key,
        ),
      ),
    );
  }

  const options =
    status.receiver && !people.some((p) => p.employeeId === status.receiver!.employeeId)
      ? [{ ...status.receiver, isSelf: false }, ...people]
      : people;

  return (
    <Modal open title={`Push ${firm} to Purchase`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {status.canChooseReceiver ? (
          <Select
            label="Goes to"
            required
            value={receiver}
            onChange={(ev) => setReceiver(ev.target.value)}
            error={save.fieldErrors.receiverEmployeeId}
          >
            <option value="">Select…</option>
            {options.map((p) => (
              <option key={p.employeeId} value={p.employeeId}>
                {p.person}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-sm">
            <span className="text-slate-500">Goes to:</span>{' '}
            <span className="font-medium">{status.receiver?.person ?? '—'}</span>
          </p>
        )}
        <Textarea
          label="What can he supply?"
          required
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          error={save.fieldErrors.note}
        />
        {save.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {save.formError}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            type="submit"
            loading={save.submitting}
            disabled={!note.trim() || (status.canChooseReceiver && !receiver)}
          >
            Push to Purchase
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
