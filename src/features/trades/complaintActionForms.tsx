import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { useReasonCodes } from '@/features/reasonCodes/hooks';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import {
  validateRaiseComplaint,
  validateResolveComplaint,
  type RaiseComplaintValues,
  type ResolveComplaintValues,
} from '@/schemas/complaintForms';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_OUTCOMES,
  COMPLAINT_OUTCOME_LABELS,
} from '@/types/complaint';
import { CONTEXT_LABELS } from '@/types/reasonCode';
import { dueText, formatDate } from '@/utils/format';
import type { Complaint } from '@/features/complaints/api';
import type { ActionFormProps } from './actionForms';
import { ActionFormShell } from './ActionFormShell';
import { useTradeAction } from './hooks';

/**
 * The deal card's Build 6 buttons (buyer side): "Buyer complains" (Sales, at b9 or b10, inside the delivery
 * window) and "Decide complaint" (the Controller, at b11). Founder and Admin may press both here.
 */

/** "Buyer complains": what is wrong, the reason from the master, and (if it is only part of the order) how many boxes. */
export function RaiseComplaintForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'raiseComplaint', onChangedByOthers);
  const reasons = useReasonCodes();
  const choices = (reasons.data ?? []).filter(
    (reason) => reason.context === 'COMPLAINT' && reason.active,
  );
  const [values, setValues] = useState<RaiseComplaintValues>({
    category: '',
    reasonCodeId: '',
    boxes: '',
    description: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof RaiseComplaintValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateRaiseComplaint(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  const lastDay = trade.complaintByAt ? formatDate(trade.complaintByAt) : null;
  return (
    <ActionFormShell
      title="Buyer complains"
      description={`The Controller decides within 48 hours.${lastDay ? ` The buyer may complain until ${lastDay}.` : ''}`}
      submitLabel="Save complaint"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="What is wrong" required error={errors.category}>
          {(field) => (
            <Select
              {...field}
              value={values.category}
              onChange={(event) => set('category', event.target.value)}
            >
              <option value="">Choose…</option>
              {COMPLAINT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {COMPLAINT_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Reason"
          required
          error={errors.reasonCodeId}
          hint={
            reasons.isSuccess && choices.length === 0
              ? `No reasons yet: Founder or Admin adds them under Reason codes ("${CONTEXT_LABELS.COMPLAINT}").`
              : undefined
          }
        >
          {(field) => (
            <Select
              {...field}
              value={values.reasonCodeId}
              onChange={(event) => set('reasonCodeId', event.target.value)}
            >
              <option value="">Choose…</option>
              {choices.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField
          label="Boxes affected"
          error={errors.boxes}
          hint="Optional. Leave empty if it is about the whole order."
        >
          {(field) => (
            <Input
              {...field}
              inputMode="numeric"
              autoComplete="off"
              value={values.boxes}
              onChange={(event) => set('boxes', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="What the buyer says" error={errors.description} hint="Optional.">
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** The complaint waiting for the Controller on a card: the one that is still open. */
export const openComplaintOf = (complaints: Complaint[] | undefined) =>
  complaints?.find((item) => item.status === 'OPEN');

/** The facts of the open complaint, so the Controller decides with them in front of him. */
export function ComplaintSummary({ complaint }: { complaint: Complaint }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-slate-800">
      <div className="font-medium">
        {complaint.number} · {COMPLAINT_CATEGORY_LABELS[complaint.category]} ·{' '}
        {complaint.reasonLabel}
      </div>
      <div className="text-xs text-slate-600">
        {complaint.boxes ? `${complaint.boxes} boxes · ` : ''}raised by {complaint.raisedBy} ·{' '}
        {dueText(complaint.resolveByAt)}
      </div>
      {complaint.description && <div className="mt-1">{complaint.description}</div>}
    </div>
  );
}

/** "Decide complaint" on the deal card: the Controller's outcome for the open complaint. */
export function ResolveComplaintForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const complaint = openComplaintOf(trade.complaints);
  return (
    <DecideForm
      trade={trade}
      complaint={complaint}
      onDone={onDone}
      onChangedByOthers={onChangedByOthers}
    />
  );
}

/**
 * The decision form. It needs only the trade's id and version, so the Complaints list uses it too.
 * What the outcome needs: a credit takes rupees, a replacement, return or refund takes boxes, "no action" nothing.
 */
export function DecideForm(props: {
  trade: { id: string; version: number };
  complaint: Complaint | undefined;
  onDone: () => void;
  onChangedByOthers: () => void;
}) {
  const action = useTradeAction(props.trade, 'resolveComplaint', props.onChangedByOthers);
  const [values, setValues] = useState<ResolveComplaintValues>({
    outcome: '',
    amount: '',
    boxes: '',
    note: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof ResolveComplaintValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateResolveComplaint(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: props.onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  const money = values.outcome === 'CREDIT';
  const goods =
    values.outcome === 'REPLACEMENT' || values.outcome === 'RETURN' || values.outcome === 'REFUND';
  return (
    <ActionFormShell
      title="Resolve the complaint"
      description="A credit note or a refund is posted to his account as soon as you save. A refund is then paid from Payouts."
      submitLabel="Save decision"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={props.onDone}
    >
      {props.complaint && <ComplaintSummary complaint={props.complaint} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Decision" required error={errors.outcome}>
          {(field) => (
            <Select
              {...field}
              value={values.outcome}
              onChange={(event) => set('outcome', event.target.value)}
            >
              <option value="">Choose…</option>
              {COMPLAINT_OUTCOMES.map((outcome) => (
                <option key={outcome} value={outcome}>
                  {COMPLAINT_OUTCOME_LABELS[outcome]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        {money && (
          <FormField
            label="Credit amount (₹, with GST)"
            required
            error={errors.amount ?? errors.amountPaise}
          >
            {(field) => (
              <Input
                {...field}
                inputMode="decimal"
                autoComplete="off"
                value={values.amount}
                onChange={(event) => set('amount', event.target.value)}
              />
            )}
          </FormField>
        )}
        {goods && (
          <FormField
            label="Boxes"
            required
            error={errors.boxes}
            hint={
              values.outcome === 'REFUND'
                ? 'The refund is these boxes at his rate, with GST.'
                : undefined
            }
          >
            {(field) => (
              <Input
                {...field}
                inputMode="numeric"
                autoComplete="off"
                value={values.boxes}
                onChange={(event) => set('boxes', event.target.value)}
              />
            )}
          </FormField>
        )}
      </div>
      <FormField
        label="Note"
        required
        error={errors.note}
        hint="Sales reads this note. Do not name the seller."
      >
        {(field) => (
          <Input
            {...field}
            autoComplete="off"
            value={values.note}
            onChange={(event) => set('note', event.target.value)}
          />
        )}
      </FormField>
    </ActionFormShell>
  );
}
