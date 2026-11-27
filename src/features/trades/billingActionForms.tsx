import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { FormField } from '@/components/molecules/FormField';
import { MargBillForm } from '@/features/billing/MargBillForm';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validatePod, type PodValues } from '@/schemas/billingForms';
import { formatRupees, todayInIndia } from '@/utils/format';
import type { ActionFormProps } from './actionForms';
import { ActionFormShell } from './ActionFormShell';
import { useTradeAction } from './hooks';

/**
 * The deal card's Build 4 buttons (buyer side): the Marg bill (Accounts, usually from To be billed), the proof of
 * dispatch (Logistics, usually from Trips) and Delivered (Sales). Founder and Admin may press all three here.
 */

/** "Marg bill" on the deal card. */
export function MargBillActionForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'recordMargBill', onChangedByOthers);
  const accepted = trade.billing?.accepted;
  if (!accepted) {
    return (
      <ActionFormShell
        title="Marg bill"
        description="The dock check is not on this card. Bill it from To be billed."
        submitLabel="Close"
        pending={false}
        error={undefined}
        onSubmit={onDone}
        onCancel={onDone}
      />
    );
  }
  return (
    <MargBillForm
      accepted={accepted}
      pending={action.isPending}
      error={action.error?.message}
      onSave={(input) => action.mutateAsync(input).then(onDone)}
      onCancel={onDone}
    />
  );
}

/** "Proof of dispatch" on the deal card: the bill must be on a trip that is out (Trips screen). */
export function PodForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'recordPod', onChangedByOthers);
  const [values, setValues] = useState<PodValues>({ ref: '', date: todayInIndia() });
  const [errors, setErrors] = useState<FormErrors>({});

  function submit() {
    const result = validatePod(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  return (
    <ActionFormShell
      title="Proof of dispatch"
      description="The LR or receipt number for this bill (its trip must be out). The buyer moves to b9 and the 7-day delivery window starts."
      submitLabel="Save POD"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <PodFields values={values} errors={errors} onChange={setValues} />
    </ActionFormShell>
  );
}

/** The two POD fields, shared with the Trips screen. */
export function PodFields({
  values,
  errors,
  onChange,
}: {
  values: PodValues;
  errors: FormErrors;
  onChange: (values: PodValues) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField label="LR or receipt number" required error={errors.ref}>
        {(field) => (
          <Input
            {...field}
            autoComplete="off"
            value={values.ref}
            onChange={(event) => onChange({ ...values, ref: event.target.value })}
          />
        )}
      </FormField>
      <FormField label="Date" required error={errors.date}>
        {(field) => (
          <Input
            {...field}
            type="date"
            max={todayInIndia()}
            value={values.date}
            onChange={(event) => onChange({ ...values, date: event.target.value })}
          />
        )}
      </FormField>
    </div>
  );
}

/** "Delivered" (Sales): the buyer has the goods. b9 → b10. */
export function ConfirmDeliveryForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'confirmDelivery', onChangedByOthers);
  return (
    <ActionFormShell
      title="Delivered"
      description="Confirm the buyer has received the goods. The order becomes Delivered."
      submitLabel="Confirm delivery"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}

/**
 * "Use the buyer's advance" (Accounts' action; Founder and Admin may press it on the card too). Money the buyer paid
 * ahead, with no order, goes to this order: the oldest payment first, never more than the order still needs.
 * If that pays it in full, the PO goes out to the seller.
 */
export function UseAdvanceForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'useAdvance', onChangedByOthers);
  const advance = trade.advance?.totalPaise ?? 0;
  const open = trade.openPaise ?? 0;
  return (
    <ActionFormShell
      title="Use the buyer's advance"
      description={`${formatRupees(advance)} is waiting as this buyer's advance; the order still needs ${formatRupees(open)}. The oldest payment is used first, and never more than the order needs.`}
      submitLabel="Use the advance"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={() => action.mutate({}, { onSuccess: onDone })}
      onCancel={onDone}
    />
  );
}
