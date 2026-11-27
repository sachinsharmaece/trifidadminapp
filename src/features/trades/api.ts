import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { EXPIRY_BAND_LABELS, PROVENANCE_LABELS } from '@/types/listing';
import { RATE_TIER_LABELS } from '@/types/party';
import {
  ASK_REASONS,
  BUYER_STAGES,
  SELLER_STAGES,
  TRADE_ACTION_NAMES,
  type AskReason,
  type DeclineReason,
} from '@/types/trade';
import { RECEIPT_STATUSES } from '@/types/books';
import { PURCHASE_ORDER_STATUSES, type FreightTerms, type Leg1Mode } from '@/types/dock';
import { payoutFactsSchema, refundSchema } from '@/features/payouts/api';
import { complaintSchema } from '@/features/complaints/api';
import { dockFactsShape } from '@/features/purchaseOrders/api';
import { acceptedSchema, deliveryShape, margBillSchema } from '@/features/billing/api';
import type { ComplaintCategory, ResolveComplaintInput } from '@/types/complaint';
import { SALES_ORDER_STATUSES } from '@/types/salesOrder';

/**
 * Trades (deal cards). The server builds each answer for the signed-in person's side of the wall: Sales gets the
 * buyer and the rate offered to him; Purchase gets the seller, his listing and his rate; supervisors get both.
 * So every side-specific field below is optional.
 */
const party = z.object({ id: z.string(), number: z.string(), firmName: z.string() });
const expiryBand = z.enum(Object.keys(EXPIRY_BAND_LABELS) as [keyof typeof EXPIRY_BAND_LABELS]);
const tier = z.enum(Object.keys(RATE_TIER_LABELS) as [keyof typeof RATE_TIER_LABELS]);
const due = z.object({ at: z.string(), label: z.string() }).nullable();

const tradeSchema = z.object({
  id: z.string(),
  number: z.string(),
  source: z.enum(['LISTED', 'NOT_LISTED']),
  buyerStage: z.enum(BUYER_STAGES),
  sellerStage: z.enum(SELLER_STAGES).nullable(),
  product: z.object({ id: z.string(), name: z.string() }),
  pack: z.object({ id: z.string(), packLabel: z.string(), unitsPerBox: z.number() }).nullable(),
  boxesWanted: z.number().nullable(),
  ask: z.object({ reason: z.enum(ASK_REASONS), note: z.string().nullable() }).nullable(),
  due,
  actions: z.array(
    z.object({
      name: z.enum(TRADE_ACTION_NAMES),
      label: z.string(),
      allowed: z.boolean(),
      reason: z.string().optional(),
    }),
  ),
  history: z.array(
    z.object({
      at: z.string(),
      action: z.string(),
      label: z.string(),
      by: z.string(),
      buyerNote: z.string().optional(),
      sellerNote: z.string().optional(),
    }),
  ),
  version: z.number(),
  lastActionAt: z.string(),

  // Buyer side (Sales and supervisors)
  buyer: party.optional(),
  boardOffer: z
    .object({
      buyerRatePaisePerUnit: z.number().nullable(),
      unitsPerBox: z.number(),
      moqBoxes: z.number(),
      quantityBoxes: z.number(),
      expiryBand,
      tier,
      indicative: z.boolean(),
      live: z.boolean(),
      /** Reference FAST-ORDER: boxes the listing confirms by itself (0 when auto-confirm is off). */
      autoBoxesLeft: z.number().optional(),
    })
    .nullable()
    .optional(),
  offer: z
    .object({
      boxes: z.number(),
      unitsPerBox: z.number(),
      expiryMonth: z.string(),
      buyerRatePaisePerUnit: z.number().nullable(),
      boxValuePaise: z.number().nullable(),
      tier,
      indicative: z.boolean(),
    })
    .nullable()
    .optional(),

  // The buyer's sales order (b6 onward) and why a trade was lost (Leakage): buyer side too.
  salesOrder: z
    .object({
      id: z.string(),
      number: z.string(),
      status: z.enum(SALES_ORDER_STATUSES),
      totalPaise: z.number(),
      paymentDueAt: z.string(),
    })
    .nullable()
    .optional(),
  // Payments entered for the order (buyer side): what is still due, and what may still be entered.
  payments: z
    .array(
      z.object({
        id: z.string(),
        number: z.string(),
        status: z.enum(RECEIPT_STATUSES),
        /** What this payment counts for on THIS order (part of a bigger advance may be used here). */
        amountPaise: z.number(),
        /** The payment's full amount. */
        receiptPaise: z.number(),
        /** Money Accounts added by hand with no order, then used on this one. */
        isAdvance: z.boolean(),
        utr: z.string(),
        bankName: z.string(),
        receivedOn: z.string(),
        enteredById: z.string(),
        rejectNote: z.string().nullable(),
      }),
    )
    .optional(),
  // The buyer's advance not yet used (buyer side, while the order waits for payment).
  advance: z
    .object({
      totalPaise: z.number(),
      payments: z.array(
        z.object({
          number: z.string(),
          utr: z.string(),
          receivedOn: z.string(),
          unspentPaise: z.number(),
        }),
      ),
    })
    .nullable()
    .optional(),
  balanceDuePaise: z.number().nullable().optional(),
  openPaise: z.number().nullable().optional(),
  // From b8: what the dock accepted at the buyer's rate, the Marg bill, the trip and delivery (buyer side).
  billing: z
    .object({
      accepted: acceptedSchema.nullable(),
      margBill: margBillSchema.nullable(),
      ...deliveryShape,
    })
    .nullable()
    .optional(),
  // Money owed back to the buyer after the dock check, and whether a payout batch has paid it (buyer side).
  refunds: z.array(refundSchema).optional(),
  // Complaints raised on the order (buyer side only: Purchase never gets them), and the last day to complain.
  complaints: z.array(complaintSchema).optional(),
  complaintByAt: z.string().nullable().optional(),
  leakage: z
    .object({
      context: z.string(),
      reasonLabel: z.string(),
      note: z.string().nullable(),
      at: z.string(),
    })
    .nullable()
    .optional(),

  // Seller side (Purchase and supervisors)
  seller: party.nullable().optional(),
  // The PO (seller side): its lines, for the dispatch and dock forms, and what happened to it so far.
  purchaseOrder: z
    .object({
      id: z.string(),
      number: z.string(),
      status: z.enum(PURCHASE_ORDER_STATUSES),
      totalPaise: z.number(),
      dispatchDueAt: z.string(),
      paidAt: z.string().nullable(),
      lines: z.array(
        z.object({
          lineNo: z.number(),
          productName: z.string(),
          packLabel: z.string(),
          unitsPerBox: z.number(),
          boxes: z.number(),
          expiryMonth: z.string(),
          batchNumber: z.string().nullable(),
        }),
      ),
      ...dockFactsShape,
    })
    .nullable()
    .optional(),
  // Where the seller's payment is (seller side only): in a batch, released, or paid with its UTR.
  payout: payoutFactsSchema.nullable().optional(),
  listing: z
    .object({
      id: z.string(),
      landedPaisePerUnit: z.number(),
      unitsPerBox: z.number(),
      moqBoxes: z.number(),
      quantityBoxes: z.number(),
      expiryBand,
      provenance: z.enum(Object.keys(PROVENANCE_LABELS) as [keyof typeof PROVENANCE_LABELS]),
      status: z.string(),
    })
    .nullable()
    .optional(),
  sellerAnswer: z
    .object({
      kind: z.enum(['CONFIRMED', 'QUOTED']),
      boxes: z.number(),
      landedPaisePerUnit: z.number(),
      unitsPerBox: z.number(),
      expiryMonth: z.string(),
      batchNumber: z.string().nullable(),
      moqBoxes: z.number().nullable(),
      boxesAvailable: z.number().nullable(),
      at: z.string(),
    })
    .nullable()
    .optional(),
});

export type Trade = z.infer<typeof tradeSchema>;
const tradeResponse = z.object({ trade: tradeSchema });

const tradeRowSchema = z.object({
  id: z.string(),
  number: z.string(),
  buyerStage: z.enum(BUYER_STAGES),
  sellerStage: z.enum(SELLER_STAGES).nullable(),
  party: z.object({ number: z.string(), firmName: z.string() }).nullable(),
  productName: z.string(),
  packLabel: z.string().nullable(),
  boxesWanted: z.number().nullable(),
  due,
  lastActionAt: z.string(),
  // Reference-copy branch (the funnel board).
  expiryMonth: z.string().nullable().optional(),
  listingId: z.string().nullable().optional(),
});
export type TradeRow = z.infer<typeof tradeRowSchema>;

const funnelSchema = z.object({
  counts: z.record(z.string(), z.number()),
  trades: z.array(tradeRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type Funnel = z.infer<typeof funnelSchema>;

export interface FunnelParams {
  /** A stage, or '' for all. */
  stage: string;
  q: string;
  page: number;
  pageSize: number;
}

export type FunnelSide = 'buyer' | 'seller';

export async function listFunnel(side: FunnelSide, params: FunnelParams, signal?: AbortSignal) {
  const { stage, ...rest } = params;
  const { data } = await apiClient.get<unknown>(`/trades/${side}-side`, {
    params: stage ? { ...rest, stage } : rest,
    signal,
  });
  return funnelSchema.parse(data);
}

export async function getTrade(id: string, signal?: AbortSignal): Promise<Trade> {
  const { data } = await apiClient.get<unknown>(`/trades/${id}`, { signal });
  return tradeResponse.parse(data).trade;
}

/** Sales opens a rate-board row for a buyer (the same open b1 trade comes back if there is one). */
export async function openViewing(buyerId: string, listingId: string): Promise<Trade> {
  const { data } = await apiClient.post<unknown>('/trades/open-viewing', { buyerId, listingId });
  return tradeResponse.parse(data).trade;
}

export interface AskInput {
  buyerId: string;
  productId: string;
  skuId?: string | undefined;
  boxes: number;
  reason: AskReason;
  note?: string | undefined;
}

export async function createAsk(input: AskInput): Promise<Trade> {
  const { data } = await apiClient.post<unknown>('/trades/asks', input);
  return tradeResponse.parse(data).trade;
}

/** The input each engine action takes (the server checks it again). */
export interface ActionInputs {
  wantIt: { boxes: number };
  orderOnCall: { boxes: number };
  sendToSeller: Record<string, never>;
  confirmStock: { boxes: number; expiryMonth: string; batchNumber?: string | undefined };
  declineStock: { reason: DeclineReason; note?: string | undefined };
  giveQuote: {
    sellerId: string;
    skuId: string;
    landedPaisePerUnit: number;
    expiryMonth: string;
    moqBoxes: number;
    boxesAvailable: number;
    batchNumber?: string | undefined;
  };
  sendToBuyer: Record<string, never>;
  buyerYes: Record<string, never>;
  buyerNo: { reasonCodeId: string; note?: string | undefined };
  leakAfterOrder: { reasonCodeId: string; note?: string | undefined };
  reopen: Record<string, never>;
  enterPayment: {
    bankLedgerId: string;
    utr: string;
    amountPaise: number;
    receivedOn: string;
  };
  confirmPayment: { receiptId: string };
  rejectPayment: { receiptId: string; note: string };
  useAdvance: Record<string, never>;
  recordDispatch: DispatchInput;
  recordSellerBill: { number: string; amountPaise: number; billDate: string };
  recordArrival: ArrivalInput;
  inspectLot: InspectionInput;
  recordMargBill: MargBillInput;
  recordPod: { ref: string; date: string };
  confirmDelivery: Record<string, never>;
  raiseComplaint: {
    category: ComplaintCategory;
    reasonCodeId: string;
    description?: string | undefined;
    boxes?: number | undefined;
  };
  resolveComplaint: ResolveComplaintInput;
  closeLostInTransit: { note: string };
  holdPayout: { reason: string };
  releaseHold: Record<string, never>;
}

/** The Marg invoice as keyed by Accounts. */
export interface MargBillInput {
  invoiceNumber: string;
  ewayBillNumber?: string | undefined;
  billDate: string;
  totalPaise: number;
  lines: { lineNo: number; boxes: number }[];
}

/** Leg 1 (Purchase). Fields that do not apply to the mode are left out. */
export interface DispatchInput {
  mode: Leg1Mode;
  transporter?: string | undefined;
  lrNumber?: string | undefined;
  lrDate?: string | undefined;
  busDetails?: string | undefined;
  driverName?: string | undefined;
  driverMobile?: string | undefined;
  note?: string | undefined;
  freightTerms: FreightTerms;
  freightPaise?: number | undefined;
  dispatchedOn: string;
  lines: {
    lineNo: number;
    batchDeclared?: string | undefined;
    expiryDeclared?: string | undefined;
    shortExpiryAgreed: boolean;
  }[];
}

/** The goods reached the dock (Logistics). `arrivedAt` is an ISO time. */
export interface ArrivalInput {
  arrivedAt: string;
  boxesCounted: number;
  billWithGoods: boolean;
}

/** The dock's check, per PO line. Short boxes are worked out by the server from the arrival count. */
export interface InspectionInput {
  lines: {
    lineNo: number;
    batchFound?: string | undefined;
    expiryFound?: string | undefined;
    damagedBoxes: number;
    leakingBoxes: number;
    excessBoxes: number;
  }[];
  note?: string | undefined;
}

/** Presses an engine button. `version` is the one on screen: if someone acted since, the server says 409. */
export async function runAction<A extends keyof ActionInputs>(
  trade: Pick<Trade, 'id' | 'version'>,
  action: A,
  input: ActionInputs[A],
): Promise<Trade> {
  const { data } = await apiClient.post<unknown>(`/trades/${trade.id}/actions/${action}`, {
    version: trade.version,
    ...input,
  });
  return tradeResponse.parse(data).trade;
}
