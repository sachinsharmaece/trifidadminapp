import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { FormField } from '@/components/molecules/FormField';
import { ArrivalForm } from '@/features/dock/ArrivalForm';
import { InspectionForm, type DockLine } from '@/features/dock/InspectionForm';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import {
  validateDispatch,
  validateSellerBill,
  type DispatchValues,
  type SellerBillValues,
} from '@/schemas/dockForms';
import { FREIGHT_TERMS, FREIGHT_TERM_LABELS, LEG1_MODES, LEG1_MODE_LABELS } from '@/types/dock';
import { formatRupees, paiseToRupeesText, todayInIndia } from '@/utils/format';
import type { ActionFormProps } from './actionForms';
import { ActionFormShell } from './ActionFormShell';
import { useTradeAction } from './hooks';

/**
 * The deal card's Build 3 buttons (seller side): Purchase records leg 1 and the seller's bill; Founder and Admin
 * may also press the dock's two buttons here (Logistics uses the Dock screen).
 */

/** "Record dispatch" (Purchase): how the seller sent the goods to Indore. */
export function RecordDispatchForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'recordDispatch', onChangedByOthers);
  const lines = trade.purchaseOrder?.lines ?? [];
  const [values, setValues] = useState<DispatchValues>({
    mode: 'TRANSPORT',
    transporter: '',
    lrNumber: '',
    lrDate: todayInIndia(),
    busDetails: '',
    driverName: '',
    driverMobile: '',
    note: '',
    freightTerms: 'PAID',
    freight: '',
    dispatchedOn: todayInIndia(),
    lines: lines.map((line) => ({
      lineNo: line.lineNo,
      batchDeclared: line.batchNumber ?? '',
      expiryDeclared: line.expiryMonth,
      shortExpiryAgreed: false,
    })),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: Exclude<keyof DispatchValues, 'lines'>, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  const setLine = (index: number, field: 'batchDeclared' | 'expiryDeclared', value: string) =>
    setValues((current) => ({
      ...current,
      lines: current.lines.map((line, at) => (at === index ? { ...line, [field]: value } : line)),
    }));

  function submit() {
    const result = validateDispatch(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  const text = (
    field: 'transporter' | 'lrNumber' | 'busDetails' | 'driverName' | 'driverMobile' | 'note',
    label: string,
    options: { required?: boolean; hint?: string; numeric?: boolean } = {},
  ) => (
    <FormField
      label={label}
      required={options.required ?? false}
      error={errors[field]}
      {...(options.hint ? { hint: options.hint } : {})}
    >
      {(field_) => (
        <Input
          {...field_}
          autoComplete="off"
          {...(options.numeric ? { inputMode: 'numeric' as const } : {})}
          value={values[field]}
          onChange={(event) => set(field, event.target.value)}
        />
      )}
    </FormField>
  );

  return (
    <ActionFormShell
      title="Record dispatch"
      description="How the seller sent the goods to the Indore dock. The dock sees this (never the seller's name or rate)."
      submitLabel="Save dispatch"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Sent by" required error={errors.mode}>
          {(field) => (
            <Select
              {...field}
              value={values.mode}
              onChange={(event) => set('mode', event.target.value)}
            >
              {LEG1_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {LEG1_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Dispatched on" required error={errors.dispatchedOn}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.dispatchedOn}
              onChange={(event) => set('dispatchedOn', event.target.value)}
            />
          )}
        </FormField>
        {values.mode === 'TRANSPORT' && (
          <>
            {text('transporter', 'Transport company', { required: true })}
            {text('lrNumber', 'LR number', { required: true })}
            <FormField label="LR date" error={errors.lrDate}>
              {(field) => (
                <Input
                  {...field}
                  type="date"
                  max={todayInIndia()}
                  value={values.lrDate}
                  onChange={(event) => set('lrDate', event.target.value)}
                />
              )}
            </FormField>
          </>
        )}
        {values.mode === 'BUS' && (
          <>
            {text('busDetails', 'Bus', { required: true, hint: 'Operator and bus number.' })}
            {text('driverName', "Driver's name")}
            {text('driverMobile', "Driver's mobile", { required: true, numeric: true })}
          </>
        )}
        {text('note', 'Note', {
          required: values.mode === 'DEPOT',
          ...(values.mode === 'DEPOT'
            ? { hint: 'Which depot, and who is bringing the goods.' }
            : {}),
        })}
        <FormField label="Freight" required error={errors.freightTerms}>
          {(field) => (
            <Select
              {...field}
              value={values.freightTerms}
              onChange={(event) => set('freightTerms', event.target.value)}
            >
              {FREIGHT_TERMS.map((terms) => (
                <option key={terms} value={terms}>
                  {FREIGHT_TERM_LABELS[terms]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        {values.freightTerms === 'TO_PAY' && (
          <FormField
            label="Freight to pay (₹)"
            required
            hint="Taken off the seller's payout later."
            error={errors.freightPaise ?? errors.freight}
          >
            {(field) => (
              <Input
                {...field}
                inputMode="decimal"
                value={values.freight}
                onChange={(event) => set('freight', event.target.value)}
              />
            )}
          </FormField>
        )}
      </div>
      {lines.map((line, index) => (
        <fieldset key={line.lineNo} className="space-y-3 rounded-md border border-slate-200 p-4">
          <legend className="px-1 text-sm font-semibold">
            What the seller packed: {line.productName} · {line.packLabel} · {line.boxes} boxes
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Batch" error={errors[`lines.${index}.batchDeclared`]}>
              {(field) => (
                <Input
                  {...field}
                  autoComplete="off"
                  value={values.lines[index]?.batchDeclared ?? ''}
                  onChange={(event) => setLine(index, 'batchDeclared', event.target.value)}
                />
              )}
            </FormField>
            <FormField label="Expiry" error={errors[`lines.${index}.expiryDeclared`]}>
              {(field) => (
                <Input
                  {...field}
                  type="month"
                  value={values.lines[index]?.expiryDeclared ?? ''}
                  onChange={(event) => setLine(index, 'expiryDeclared', event.target.value)}
                />
              )}
            </FormField>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={values.lines[index]?.shortExpiryAgreed ?? false}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  lines: current.lines.map((item, at) =>
                    at === index ? { ...item, shortExpiryAgreed: event.target.checked } : item,
                  ),
                }))
              }
            />
            A short expiry was agreed in the deal (the dock will not flag it)
          </label>
        </fieldset>
      ))}
    </ActionFormShell>
  );
}

/** "Seller bill" (Purchase): the seller's tax invoice. Entering it again replaces it. */
export function SellerBillForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'recordSellerBill', onChangedByOthers);
  const po = trade.purchaseOrder;
  const [values, setValues] = useState<SellerBillValues>({
    number: po?.sellerBill?.number ?? '',
    amount: paiseToRupeesText(po?.sellerBill?.amountPaise ?? po?.totalPaise ?? 0),
    billDate: po?.sellerBill?.billDate ?? todayInIndia(),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const set = (field: keyof SellerBillValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateSellerBill(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    action.mutate(result.data, {
      onSuccess: onDone,
      onError: (error) => setErrors(serverFieldErrors(error)),
    });
  }

  return (
    <ActionFormShell
      title={po?.sellerBill ? 'Replace the seller bill' : 'Seller bill'}
      description={`The seller's tax invoice for ${po?.number ?? 'the PO'} (PO total ${formatRupees(po?.totalPaise ?? 0)}). Needed before he is paid. A different amount is saved with a warning.`}
      submitLabel="Save bill"
      pending={action.isPending}
      error={action.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Bill number" required error={errors.number}>
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.number}
              onChange={(event) => set('number', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Amount (₹)" required error={errors.amountPaise ?? errors.amount}>
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Bill date" required error={errors.billDate}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.billDate}
              onChange={(event) => set('billDate', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}

/** The PO's lines with what the seller declared at dispatch, as the dock forms want them. */
function dockLinesOf(trade: ActionFormProps['trade']): DockLine[] {
  const po = trade.purchaseOrder;
  return (po?.lines ?? []).map((line) => {
    const declared = po?.leg1?.lines.find((item) => item.lineNo === line.lineNo);
    return {
      lineNo: line.lineNo,
      productName: line.productName,
      packLabel: line.packLabel,
      boxes: line.boxes,
      expiryMonth: line.expiryMonth,
      batchNumber: line.batchNumber,
      batchDeclared: declared?.batchDeclared ?? null,
      expiryDeclared: declared?.expiryDeclared ?? null,
      shortExpiryAgreed: declared?.shortExpiryAgreed ?? false,
    };
  });
}

/** "Goods arrived" on the deal card (Founder and Admin; Logistics uses the Dock screen). */
export function RecordArrivalForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'recordArrival', onChangedByOthers);
  const ordered = (trade.purchaseOrder?.lines ?? []).reduce((sum, line) => sum + line.boxes, 0);
  return (
    <ArrivalForm
      ordered={ordered}
      pending={action.isPending}
      error={action.error?.message}
      onSave={(input) => action.mutateAsync(input).then(onDone)}
      onCancel={onDone}
    />
  );
}

/** "Check the goods" on the deal card (Founder and Admin; Logistics uses the Dock screen). */
export function InspectLotForm({ trade, onDone, onChangedByOthers }: ActionFormProps) {
  const action = useTradeAction(trade, 'inspectLot', onChangedByOthers);
  return (
    <InspectionForm
      lines={dockLinesOf(trade)}
      boxesCounted={trade.purchaseOrder?.arrival?.boxesCounted ?? 0}
      pending={action.isPending}
      error={action.error?.message}
      onSave={(input) => action.mutateAsync(input).then(onDone)}
      onCancel={onDone}
    />
  );
}
