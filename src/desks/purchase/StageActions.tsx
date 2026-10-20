import { useState } from 'react';
import {
  confirmStockHold,
  handToDispatch,
  recordSellerInvoice,
  requestStockHold,
  type PoStageItem,
  type StockQueueItem,
} from '../../api/purchase';
import { ActionModal, useAction } from '../../components/ActionModal';
import { useAuth } from '../../auth/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PERMISSIONS } from '../../lib/permissions';

/**
 * Purchase desk stage buttons — Stock → PO → Billed → Dispatch. Each records what the seller
 * said on a call, so each opens the same small form with the mandatory call note.
 */

/** Stock: ask the seller to hold the confirmed stock until the buyer pays (24 hours unless told). */
export function AskHoldButton({ item, onDone }: { item: StockQueueItem; onDone: () => void }) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState('24');
  const holdHours = Number(hours);
  const hoursOk = Number.isInteger(holdHours) && holdHours >= 1 && holdHours <= 72;
  const submit = useAction(async (token, callNote) => {
    await requestStockHold(token, item.soId, { holdHours, callNote });
    return `Asked ${item.sellerFirm} to hold it for ${holdHours} hours.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.PROXY_SELLER_CALL)) return null;
  const again = item.hold !== 'not_asked';
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        {again ? 'Ask again' : 'Ask to hold'}
      </Button>
      <ActionModal
        open={open}
        title={`Hold stock for ${item.soNo}`}
        submitLabel="Ask to hold"
        canSubmit={hoursOk}
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          {item.brand} · {item.packLabel} · {item.boxes} boxes at {item.sellerFirm}. He holds it
          until the buyer pays; if the buyer does not pay in his window the order cancels and the
          seller is released with no strike.
        </p>
        <Input
          label="Hold for (hours)"
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

/** Stock: the seller has said yes, he is holding it. */
export function ConfirmHoldButton({
  item,
  onDone,
}: {
  item: StockQueueItem;
  onDone: () => void;
}) {
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await confirmStockHold(token, item.soId, { callNote });
    return `${item.sellerFirm} is holding the stock.`;
  }, onDone);
  if (!hasPermission(PERMISSIONS.PROXY_SELLER_CALL)) return null;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Seller is holding
      </Button>
      <ActionModal
        open={open}
        title={`${item.sellerFirm} is holding ${item.soNo}`}
        submitLabel="Record that he is holding it"
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-600">
          Records his yes for the hold that runs until{' '}
          {item.holdUntil ? new Date(item.holdUntil).toLocaleString() : '—'}.
        </p>
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
