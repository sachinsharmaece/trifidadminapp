import { useState } from 'react';
import {
  adjustStockHold,
  handToDispatch,
  postApplyInspection,
  recordSellerDispatched,
  recordSellerInvoice,
  type DispatchQueueItem,
  type PoStageItem,
  type SellerAfterDispatchRow,
  type StockQueueItem,
} from '../../api/purchase';
import { ActionModal, errorText, useAction } from '../../components/ActionModal';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { PERMISSIONS } from '../../lib/permissions';

/**
 * Purchase desk stage buttons — Stock → PO → Billed → Dispatch. Each records what the seller
 * said on a call, so each opens the same small form with the mandatory call note.
 */

/** Stock: the hold opens with the order (24 hours); Purchase can change how long the seller holds it. */
export function AdjustHoldButton({ item, onDone }: { item: StockQueueItem; onDone: () => void }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(String(item.holdHours ?? 24));
  const holdHours = Number(hours);
  const hoursOk = Number.isInteger(holdHours) && holdHours >= 1 && holdHours <= 72;
  const submit = useAction(async (token, callNote) => {
    await adjustStockHold(token, item.soId, { holdHours, callNote });
    return `${item.sellerFirm} will hold it for ${holdHours} hours from now.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.PROXY_SELLER_CALL)) return null;
  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setHours(String(item.holdHours ?? 24));
          setOpen(true);
        }}
      >
        Adjust hours
      </Button>
      <ActionModal
        open={open}
        title={`Hold stock for ${item.soNo}`}
        submitLabel="Change the hold"
        canSubmit={hoursOk}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {item.brand} · {item.packLabel} · {item.boxes} boxes at {item.sellerFirm}. The stock is
          already on hold until the buyer pays; if he does not pay in his window the order cancels
          and the seller is released with no strike. Set a different number of hours only if the
          seller agreed to it.
        </p>
        <Input
          label="Hold for (hours, from now)"
          type="number"
          min={1}
          max={72}
          required
          value={hours}
          onChange={(event) => setHours(event.target.value)}
          hint="24 hours matches the buyer’s payment window."
        />
      </ActionModal>
    </>
  );
}

/** PO → Billed: the seller has invoiced the goods; record his invoice and e-way bill. */
export function RecordInvoiceButton({ po, onDone }: { po: PoStageItem; onDone: () => void }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [ewayNo, setEwayNo] = useState('');
  const submit = useAction(async (token, callNote) => {
    await recordSellerInvoice(token, po.poId, {
      invoiceNo: invoiceNo.trim(),
      date: new Date(date).toISOString(),
      ewayNo: ewayNo.trim(),
      callNote,
    });
    return `${po.poNo} billed — now in Billed.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.PROXY_SELLER_CALL)) return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Seller billed
      </Button>
      <ActionModal
        open={open}
        title={`${po.sellerFirm} has billed ${po.poNo}`}
        submitLabel="Record his invoice"
        canSubmit={invoiceNo.trim().length > 0 && ewayNo.trim().length > 0}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {po.brand} · {po.packLabel} · {po.boxes} boxes. Take his invoice and e-way bill numbers
          down as he reads them out.
        </p>
        <Input
          label="Seller’s invoice number"
          required
          value={invoiceNo}
          onChange={(event) => setInvoiceNo(event.target.value)}
        />
        <Input
          label="Invoice date"
          type="date"
          required
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
        <Input
          label="E-way bill number"
          required
          value={ewayNo}
          onChange={(event) => setEwayNo(event.target.value)}
        />
      </ActionModal>
    </>
  );
}

/** Dispatch → At Indore: the seller says he has sent it. Same details Logistics records (BR-176). */
export function SellerDispatchedButton({
  item,
  onDone,
}: {
  item: DispatchQueueItem;
  onDone: () => void;
}) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'transport' | 'bus'>('transport');
  const [transporter, setTransporter] = useState('');
  const [lr, setLr] = useState('');
  const [busNo, setBusNo] = useState('');
  const [driver, setDriver] = useState('');
  const [driverMobile, setDriverMobile] = useState('');
  const [freightTerms, setFreightTerms] = useState<'prepaid' | 'to_pay'>('to_pay');
  const [freight, setFreight] = useState('0');
  const freightAmountPaise = Math.round(Number(freight) * 100);
  const detailsOk =
    mode === 'transport'
      ? lr.trim().length > 0
      : busNo.trim().length > 0 && driver.trim().length > 0 && driverMobile.trim().length > 0;
  const submit = useAction(async (token, callNote) => {
    await recordSellerDispatched(token, item.poId, {
      mode,
      ...(mode === 'transport'
        ? { ...(transporter.trim() ? { transporter: transporter.trim() } : {}), lr: lr.trim() }
        : { busNo: busNo.trim(), driver: driver.trim(), driverMobile: driverMobile.trim() }),
      freightTerms,
      freightAmountPaise,
      callNote,
    });
    return `${item.poNo} is on the way to Indore.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.PROXY_SELLER_CALL)) return null;
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Seller dispatched
      </Button>
      <ActionModal
        open={open}
        title={`${item.sellerFirm} has sent ${item.poNo}`}
        submitLabel="Record dispatch"
        canSubmit={detailsOk && Number.isFinite(freightAmountPaise) && freightAmountPaise >= 0}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {item.brand} · {item.packLabel} · {item.boxes} boxes. Leg 1, to Indore. When it arrives
          the dock records goods-in — that is not done here.
        </p>
        <Select
          label="How it went"
          value={mode}
          onChange={(event) => setMode(event.target.value as 'transport' | 'bus')}
        >
          <option value="transport">Transport (LR)</option>
          <option value="bus">Bus</option>
        </Select>
        {mode === 'transport' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="LR number" required value={lr} onChange={(e) => setLr(e.target.value)} />
            <Input
              label="Transporter"
              value={transporter}
              onChange={(e) => setTransporter(e.target.value)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Bus number"
              required
              value={busNo}
              onChange={(e) => setBusNo(e.target.value)}
            />
            <Input
              label="Driver"
              required
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
            />
            <Input
              label="Driver mobile"
              required
              value={driverMobile}
              onChange={(e) => setDriverMobile(e.target.value)}
            />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Freight"
            value={freightTerms}
            onChange={(event) => setFreightTerms(event.target.value as 'prepaid' | 'to_pay')}
          >
            <option value="to_pay">To pay</option>
            <option value="prepaid">Prepaid</option>
          </Select>
          <Input
            label="Freight amount (₹)"
            type="number"
            step="0.01"
            min="0"
            value={freight}
            onChange={(e) => setFreight(e.target.value)}
          />
        </div>
      </ActionModal>
    </>
  );
}

/**
 * At Indore → inspected: Purchase applies the dock's finding (BR-190 — the dock records,
 * Purchase applies). It books the seller's bill on the accepted boxes and raises a debit note for
 * any rejected; a whole-lot rejection becomes a supply failure instead. Not a call, so no note.
 */
export function ApplyInspectionButton({
  row,
  onDone,
}: {
  row: SellerAfterDispatchRow;
  onDone: () => void;
}) {
  const { callApi } = useAuth();
  const { show } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await callApi((token) => postApplyInspection(token, row.poId));
      show(
        result.soState === 'inspected'
          ? `${row.poNo} inspection applied.`
          : `${row.poNo}: whole lot rejected — moved to supply failure.`,
      );
      setOpen(false);
      onDone();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Apply inspection
      </Button>
      <Modal
        open={open}
        title={`Apply the inspection on ${row.poNo}`}
        onClose={() => setOpen(false)}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            The dock has recorded its finding. Applying it books the seller’s bill on the accepted
            boxes and raises a debit note for any rejected ones. A whole-lot rejection is a supply
            failure instead. This cannot be undone.
          </p>
          {error && (
            <p role="alert" className="text-sm text-danger-600">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Back
            </Button>
            <Button loading={busy} onClick={() => void apply()}>
              Apply inspection
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/** Billed → Dispatch: hand the invoiced PO over to the dispatch chase. */
export function HandToDispatchButton({ po, onDone }: { po: PoStageItem; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await handToDispatch(token, po.poId, { callNote });
    return `${po.poNo} is with Dispatch.`;
  }, onDone);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Move to dispatch
      </Button>
      <ActionModal
        open={open}
        title={`${po.poNo} is ready for ${po.sellerFirm} to send`}
        submitLabel="Move to dispatch"
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          It then sits on Dispatch, where the seller is chased until it is on the way to Indore.
        </p>
      </ActionModal>
    </>
  );
}
