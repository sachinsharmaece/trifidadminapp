import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateHoldPayout, validateLostInTransit } from '@/schemas/controllerForms';
import { formatDate, formatRupees } from '@/utils/format';
import type { ActionFormProps } from './actionForms';
import { ActionFormShell } from './ActionFormShell';
import type { Trade } from './api';
import { useTradeAction } from './hooks';

/**
 * The Controller's Build 7 buttons on the deal card (Founder and Admin may press them too):
 * "Close as lost in transit" (s5, once the arrival time has passed), "Hold the payout" and "Release the hold" (s6).
 */

/** The deal card's "Close as lost in transit": the same form the Today page opens (it only needs id and version). */
export function CloseLostInTransitForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  return (
    <LostInTransitForm
      trade={trade}
      dueAt={trade.due?.at ?? null}
      owedPaise={trade.salesOrder?.totalPaise ?? null}
      onDone={onDone}
      onChangedByOthers={onChangedByOthers}
    />
  );
}

interface LostInTransitFormProps {
  trade: Pick<Trade, 'id' | 'version'>;
  /** When the goods were due at the dock, to remind the Controller what he is closing. */
  dueAt: string | null;
  /** What the buyer gets back, when known (the deal card knows it; the Today list does not). */
  owedPaise: number | null;
  onDone: () => void;
  onChangedByOthers: () => void;
}

/** "Close as lost in transit": the buyer is refunded in full, the seller gets a strike, nothing is owed to him. */
export function LostInTransitForm({
  trade,
  dueAt,
  owedPaise,
  onDone,
  onChangedByOthers,
}: LostInTransitFormProps) {
  const action = useTradeAction(trade, 'closeLostInTransit', onChangedByOthers);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateLostInTransit({ note });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  const due = dueAt ? ` by ${formatDate(dueAt)}` : '';
  const refund = owedPaise ? `${formatRupees(owedPaise)} ` : '';
  return (
    <ActionFormShell
      title="Close as lost in transit"
      description={`The goods were due at the dock${due} and have not come. The buyer is refunded ${refund}in full (Accounts pays it from Payouts), the seller gets a strike and is owed nothing. Sales may reopen the deal.`}
      submitLabel="Close as lost"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <FormField
        label="What you found out"
        required
        error={errors.note}
        hint="For example: the transporter confirmed the truck never reached Indore."
      >
        {(field) => (
          <Input
            {...field}
            autoComplete="off"
            maxLength={250}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        )}
      </FormField>
    </ActionFormShell>
  );
}

/** "Hold the payout": the seller will not be paid until the hold is released. Sales never sees it. */
export function HoldPayoutForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'holdPayout', onChangedByOthers);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validateHoldPayout({ reason });
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  return (
    <ActionFormShell
      title="Hold the payout"
      description="The seller stays out of To pay (it shows 'On hold') until you release the hold. If the PO is already in a payout batch, cancel the batch first."
      submitLabel="Hold the payout"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <FormField
        label="Why"
        required
        error={errors.reason}
        hint="For example: the seller disputes the return note."
      >
        {(field) => (
          <Input
            {...field}
            autoComplete="off"
            maxLength={250}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        )}
      </FormField>
    </ActionFormShell>
  );
}

/** "Release the hold": the seller may be paid again. */
export function ReleaseHoldForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'releaseHold', onChangedByOthers);
  const why = trade.purchaseOrder?.hold?.reason;
  return (
    <ActionFormShell
      title="Release the hold"
      description={`The seller can be paid again; Accounts will see it ready in To pay.${why ? ` It was held because: ${why}` : ''}`}
      submitLabel="Release the hold"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}
