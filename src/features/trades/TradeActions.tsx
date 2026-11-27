import { useState } from 'react';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import type { TradeActionName } from '@/types/trade';
import {
  BuyerNoForm,
  BuyerYesForm,
  ConfirmPaymentForm,
  ConfirmStockForm,
  EnterPaymentForm,
  RejectPaymentForm,
  DeclineStockForm,
  LeakAfterOrderForm,
  QuoteForm,
  ReopenForm,
  SendToBuyerForm,
  SendToSellerForm,
  OrderOnCallForm,
  WantItForm,
  type ActionFormProps,
} from './actionForms';
import type { Trade } from './api';
import {
  ConfirmDeliveryForm,
  MargBillActionForm,
  PodForm,
  UseAdvanceForm,
} from './billingActionForms';
import { RaiseComplaintForm, ResolveComplaintForm } from './complaintActionForms';
import { CloseLostInTransitForm, HoldPayoutForm, ReleaseHoldForm } from './controllerActionForms';
import {
  InspectLotForm,
  RecordArrivalForm,
  RecordDispatchForm,
  SellerBillForm,
} from './dockActionForms';

const FORMS: Record<TradeActionName, (props: ActionFormProps) => React.JSX.Element> = {
  wantIt: WantItForm,
  orderOnCall: OrderOnCallForm,
  sendToSeller: SendToSellerForm,
  confirmStock: ConfirmStockForm,
  declineStock: DeclineStockForm,
  giveQuote: QuoteForm,
  sendToBuyer: SendToBuyerForm,
  buyerYes: BuyerYesForm,
  buyerNo: BuyerNoForm,
  leakAfterOrder: LeakAfterOrderForm,
  reopen: ReopenForm,
  enterPayment: EnterPaymentForm,
  confirmPayment: ConfirmPaymentForm,
  rejectPayment: RejectPaymentForm,
  useAdvance: UseAdvanceForm,
  recordDispatch: RecordDispatchForm,
  recordSellerBill: SellerBillForm,
  recordArrival: RecordArrivalForm,
  inspectLot: InspectLotForm,
  recordMargBill: MargBillActionForm,
  recordPod: PodForm,
  confirmDelivery: ConfirmDeliveryForm,
  raiseComplaint: RaiseComplaintForm,
  resolveComplaint: ResolveComplaintForm,
  closeLostInTransit: CloseLostInTransitForm,
  holdPayout: HoldPayoutForm,
  releaseHold: ReleaseHoldForm,
};

/** The "no" buttons look quieter than the ones that move the trade forward. */
const QUIET_BUTTONS: TradeActionName[] = [
  'declineStock',
  'buyerNo',
  'leakAfterOrder',
  'rejectPayment',
  'recordSellerBill',
  'raiseComplaint',
  'holdPayout',
];

/**
 * The trade's buttons, exactly as the server listed them: a button another desk presses is shown greyed with
 * who does it ("Purchase does this"). Pressing one opens its small form below.
 */
export function TradeActions({ trade }: { trade: Trade }) {
  // The open form remembers the trade version it was opened on.
  const [open, setOpen] = useState<{ name: TradeActionName; version: number } | null>(null);
  // Set when someone else acted first: their change is kept, this person's press was not saved.
  const [changedByOthers, setChangedByOthers] = useState(false);
  const notice = changedByOthers
    ? 'Someone else acted on this trade first, so your change was not saved. The card now shows the latest stage (see History).'
    : undefined;
  if (trade.actions.length === 0) {
    return (
      <div className="space-y-3">
        <ErrorAlert message={notice} />
        <p className="text-sm text-slate-500">Nothing to do on this trade yet.</p>
      </div>
    );
  }
  // If someone else moved the trade meanwhile (409 reloads the card), the form closes and the new state shows.
  const OpenForm = open && open.version === trade.version ? FORMS[open.name] : null;

  return (
    <div className="space-y-3">
      <ErrorAlert message={notice} />
      <div className="flex flex-wrap items-center gap-2">
        {trade.actions.map((action) => (
          <span key={action.name} className="inline-flex items-center gap-2">
            <Button
              variant={QUIET_BUTTONS.includes(action.name) ? 'secondary' : 'primary'}
              disabled={!action.allowed || OpenForm !== null}
              onClick={() => {
                setChangedByOthers(false);
                setOpen({ name: action.name, version: trade.version });
              }}
            >
              {action.label}
            </Button>
            {!action.allowed && action.reason && (
              <span className="text-xs text-slate-500">{action.reason}</span>
            )}
          </span>
        ))}
      </div>
      {OpenForm && (
        <OpenForm
          key={trade.id}
          trade={trade}
          onDone={() => setOpen(null)}
          onChangedByOthers={() => setChangedByOthers(true)}
        />
      )}
    </div>
  );
}
