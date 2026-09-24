import type { BadgeTone } from '../../components/ui/Badge';
import { PERMISSIONS } from '../../lib/permissions';
import type {
  DropReason,
  EnquiryKind,
  EnquiryPartyKind,
  EnquiryPhase,
  EnquiryStatus,
  TradeStatus,
  WaitingOn,
} from '../../api/enquiry';

/**
 * Which side of an enquiry this screen is showing — the same decision the
 * server makes in chain.view.ts `chainViewAudienceFor` (TD-007: from
 * permissions, never a role name). The server has already removed what this
 * desk may not see; this only picks the wording.
 */
export type Desk = 'full' | 'sales' | 'purchase' | 'logistics';

export function deskFor(hasPermission: (permission: string) => boolean): Desk {
  if (hasPermission(PERMISSIONS.CHAIN_READ_FULL)) return 'full';
  const isSales = hasPermission(PERMISSIONS.SO_CREATE);
  const isPurchase = hasPermission(PERMISSIONS.PO_CREATE);
  if (isSales && !isPurchase) return 'sales';
  if (isPurchase && !isSales) return 'purchase';
  return 'logistics';
}

export const STATUS_LABEL: Record<EnquiryStatus, string> = {
  pre_trade: 'Pre-trade',
  head_start: 'Head start',
  awaiting_quotes: 'Awaiting quotes',
  awaiting_seller: 'Awaiting seller',
  quotes_received: 'Quotes received',
  requoted: 'Seller requoted',
  confirming: 'Confirming',
  shortfall: 'Short pile',
  ordered: 'Ordered',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  lapsed: 'Lapsed',
  dropped: 'Dropped',
  listed: 'Listed',
};

export const STATUS_TONE: Record<EnquiryStatus, BadgeTone> = {
  pre_trade: 'warn',
  head_start: 'neutral',
  awaiting_quotes: 'neutral',
  awaiting_seller: 'warn',
  quotes_received: 'warn',
  requoted: 'warn',
  confirming: 'neutral',
  shortfall: 'bad',
  ordered: 'good',
  declined: 'bad',
  withdrawn: 'neutral',
  lapsed: 'neutral',
  dropped: 'neutral',
  listed: 'good',
};

export const TRADE_STATUS_LABEL: Record<TradeStatus, string> = {
  in_trade: 'in trade',
  completed: 'completed',
  cancelled: 'cancelled',
};

export const PHASES: Array<{ key: EnquiryPhase; label: string }> = [
  { key: 'raised', label: 'Raised' },
  { key: 'responded', label: 'Response' },
  { key: 'ordered', label: 'Order' },
  { key: 'closed', label: 'Closed' },
];

export const WAITING_ON_LABEL: Record<Exclude<WaitingOn, null>, string> = {
  buyer: 'Buyer',
  seller: 'Seller',
  desk: 'Desk',
  system: 'System',
};

export const KIND_LABEL: Record<EnquiryKind, string> = {
  pre_trade: 'Pre-trade',
  ask: 'Ask',
  pile_request: 'Listed rate',
};

export const DROP_REASON_LABEL: Record<DropReason, string> = {
  buyer_not_registrable: 'Buyer cannot register',
  product_not_stocked: 'Product not stocked',
  buyer_lost_interest: 'Buyer lost interest',
  duplicate: 'Duplicate enquiry',
  other: 'Other',
};

/** What this desk should do about an enquiry in this status — one sentence, or nothing. */
const NEXT_STEP: Record<Desk, Partial<Record<EnquiryStatus, string>>> = {
  sales: {
    head_start:
      'Trusted and Committed sellers have the first four working hours. Nothing to do yet.',
    awaiting_quotes: 'Open to every seller. Wait for quotes, or walk away if the buyer drops it.',
    quotes_received: 'Call the buyer — accept the quote(s) he wants, or walk away.',
    awaiting_seller: 'The seller has not decided yet. Purchase chases the pile.',
    requoted:
      'The seller revised the rate. The buyer accept/cancel step is not built yet (QR-045).',
    confirming: 'The seller confirmed — the order is raised within seconds.',
    shortfall: 'The seller can send less than asked — waiting on desk adjudication (BR-134).',
    ordered: 'Ordered. Follow the chain below; an order awaiting payment means chasing the money.',
  },
  purchase: {
    head_start: 'Only Trusted and Committed sellers can see this ask yet.',
    awaiting_quotes: 'No quote yet — find supply.',
    quotes_received: 'Quoted — the buyer is deciding.',
    awaiting_seller: 'Call the seller — confirm, requote or decline the pile for him.',
    requoted: 'Requoted. The buyer step is not built yet (QR-045).',
    confirming: 'Inside the five-second undo window.',
    shortfall: 'Short pile — adjudicate who gets what (BR-134).',
    ordered: 'Raise the PO once the order is paid, then follow the chain below.',
  },
  logistics: {
    ordered: 'Watch the chain below for leg 1 and leg 2 movements.',
  },
  full: {
    quotes_received: 'Waiting on the buyer to pick quotes.',
    awaiting_seller: 'Waiting on the seller to decide the pile.',
    requoted: 'The buyer accept/cancel step is not built yet (QR-045).',
    shortfall: 'Short pile — waiting on desk adjudication (BR-134).',
  },
};

/** `pre_trade` needs its own text per party — the other desk has nothing to do with it. */
const PRE_TRADE_NEXT_STEP: Record<Desk, Partial<Record<EnquiryPartyKind, string>>> = {
  sales: {
    buyer:
      'Get the buyer registered and the product into the catalogue, then convert this to an ask — or drop it with a reason.',
    seller: 'This is a Purchase lead. Nothing for Sales here.',
  },
  purchase: {
    buyer: 'This is a Sales lead. Nothing for Purchase here.',
    seller: 'Mark it listed once you have made him a listing, or drop it with a reason.',
  },
  logistics: {},
  full: {
    buyer: 'Waiting on Sales to convert or drop it.',
    seller: 'Waiting on Purchase to mark it listed or drop it.',
  },
};

export function nextStepFor(
  desk: Desk,
  status: EnquiryStatus,
  party: EnquiryPartyKind = 'buyer',
): string | null {
  if (desk === 'logistics' && status !== 'ordered') {
    return 'Not an order yet — nothing for Logistics.';
  }
  if (status === 'pre_trade') return PRE_TRADE_NEXT_STEP[desk][party] ?? null;
  return NEXT_STEP[desk][status] ?? null;
}

const TIMELINE_LABEL: Record<string, string> = {
  'enquiry_raised:self': 'Enquiry raised by the buyer',
  'enquiry_raised:sales_call': 'Enquiry logged on a call',
  enquiry_dropped: 'Enquiry dropped',
  enquiry_listed: 'Marked listed',
  ask_raised: 'Ask raised',
  opened_to_all_sellers: 'Opened to all sellers',
  quote_received: 'Quote received',
  ask_withdrawn: 'Buyer walked away',
  ask_lapsed: 'Ask lapsed',
  rate_taken: 'Listed rate taken',
  seller_confirmed: 'Seller confirmed',
  seller_requoted: 'Seller requoted',
  seller_declined: 'Seller declined',
  orders_raised: 'Order raised',
  shortfall_to_desk: 'Short pile sent to desk',
};

export function timelineLabel(type: string): string {
  if (type.startsWith('staff_call:')) {
    return `Staff call — ${type.slice('staff_call:'.length).replaceAll('_', ' ')}`;
  }
  return TIMELINE_LABEL[type] ?? type.replaceAll('_', ' ');
}

export function productText(item: {
  product: { brand: string; packLabel: string | null } | null;
  productText?: string | null;
}): string {
  if (item.product) {
    return item.product.packLabel
      ? `${item.product.brand} · ${item.product.packLabel}`
      : item.product.brand;
  }
  return item.productText ? `${item.productText} (not in catalogue)` : '—';
}

export function rupees(paise: number | null | undefined): string {
  return paise === null || paise === undefined ? '—' : `₹${(paise / 100).toFixed(2)}`;
}

export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString() : '—';
