import { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { ChoicePicker } from '@/components/molecules/ChoicePicker';
import { FormField } from '@/components/molecules/FormField';
import { useBankAccounts } from '@/features/bankAccounts/hooks';
import { ActionFormShell } from '@/features/trades/ActionFormShell';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { serverFieldErrors, type FormErrors } from '@/schemas/fields';
import { validateHandPayment, type HandPaymentValues } from '@/schemas/booksForms';
import { todayInIndia } from '@/utils/format';
import { useAddHandPayment, useBuyerChoices } from './hooks';

/**
 * "Add a payment": money reached our bank and there is no order for it yet (the buyer paid ahead). A different
 * person confirms it; once confirmed it is an advance on the buyer's account, used on an order later.
 */
export function HandPaymentForm({ onDone }: { onDone: () => void }) {
  const add = useAddHandPayment();
  const banks = useBankAccounts(true);
  const [values, setValues] = useState<HandPaymentValues>({
    bankLedgerId: '',
    buyerId: '',
    utr: '',
    amount: '',
    receivedOn: todayInIndia(),
    note: '',
  });
  const [buyerText, setBuyerText] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const q = useDebouncedValue(buyerText.trim());
  const buyers = useBuyerChoices(values.buyerId ? '' : q);
  const set = (field: keyof HandPaymentValues, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  function submit() {
    const result = validateHandPayment(values);
    if (!result.ok) return setErrors(result.errors);
    setErrors({});
    const { amount, ...rest } = result.data;
    add.mutate(
      { ...rest, amountPaise: amount },
      { onSuccess: onDone, onError: (error) => setErrors(serverFieldErrors(error)) },
    );
  }

  return (
    <ActionFormShell
      title="Add a payment"
      description="Money reached the bank but no order is waiting for it. Someone else confirms it; after that it stays as the buyer's advance until it is used on an order."
      submitLabel="Add payment"
      pending={add.isPending}
      error={add.error?.message}
      onSubmit={submit}
      onCancel={onDone}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Bank account" required error={errors.bankLedgerId}>
          {(field) => (
            <Select
              {...field}
              value={values.bankLedgerId}
              onChange={(event) => set('bankLedgerId', event.target.value)}
            >
              <option value="">Choose…</option>
              {(banks.data ?? []).map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Buyer" required error={errors.buyerId}>
          {(field) => (
            <ChoicePicker
              {...field}
              text={buyerText}
              onTextChange={(text) => {
                setBuyerText(text);
                set('buyerId', '');
              }}
              options={values.buyerId ? [] : (buyers.data ?? [])}
              loading={buyers.isFetching}
              optionKey={(buyer) => buyer.id}
              optionLabel={(buyer) => `${buyer.firmName} (${buyer.number})`}
              onPick={(buyer) => {
                set('buyerId', buyer.id);
                setBuyerText(`${buyer.firmName} (${buyer.number})`);
              }}
              placeholder="Type two letters of the buyer's name"
              emptyText={q.length < 2 ? 'Keep typing…' : 'No buyer matches.'}
            />
          )}
        </FormField>
        <FormField label="UTR" required error={errors.utr}>
          {(field) => (
            <Input
              {...field}
              autoComplete="off"
              value={values.utr}
              onChange={(event) => set('utr', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Amount (₹)" required error={errors.amount ?? errors.amountPaise}>
          {(field) => (
            <Input
              {...field}
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => set('amount', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Date the money came in" required error={errors.receivedOn}>
          {(field) => (
            <Input
              {...field}
              type="date"
              max={todayInIndia()}
              value={values.receivedOn}
              onChange={(event) => set('receivedOn', event.target.value)}
            />
          )}
        </FormField>
        <FormField label="Note" hint="Optional: what it is for." error={errors.note}>
          {(field) => (
            <Input
              {...field}
              value={values.note}
              onChange={(event) => set('note', event.target.value)}
            />
          )}
        </FormField>
      </div>
    </ActionFormShell>
  );
}
