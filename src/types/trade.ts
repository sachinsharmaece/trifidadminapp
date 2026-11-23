/** Trade stages and reasons, as the API uses them (server: shared/enums.ts). Built so far: b1–b6, s0–s2. */
export const BUYER_STAGES = [
  'B1_VIEWING',
  'B2_INQUIRY',
  'B3_PENDING_SELLER',
  'B4_SEND_CONFIRMATION',
  'B5_BUYERS_CALL',
  'B6_ORDER_CONFIRMED',
  'X_LEAKAGE',
] as const;
export type BuyerStage = (typeof BUYER_STAGES)[number];

export const BUYER_STAGE_LABELS: Record<BuyerStage, string> = {
  B1_VIEWING: 'b1 Viewing',
  B2_INQUIRY: 'b2 Inquiry',
  B3_PENDING_SELLER: 'b3 Pending seller',
  B4_SEND_CONFIRMATION: 'b4 Send confirmation',
  B5_BUYERS_CALL: "b5 Buyer's call",
  B6_ORDER_CONFIRMED: 'b6 Order confirmed',
  X_LEAKAGE: 'Leakage',
};

export const SELLER_STAGES = ['S0_DEMAND', 'S1_CONFIRMATION', 'S2_HOLD', 'S_RELEASED'] as const;
export type SellerStage = (typeof SELLER_STAGES)[number];

export const SELLER_STAGE_LABELS: Record<SellerStage, string> = {
  S0_DEMAND: 's0 Find a seller',
  S1_CONFIRMATION: 's1 Seller confirmation',
  S2_HOLD: 's2 Hold for payment',
  S_RELEASED: 'Released',
};

export const ASK_REASONS = [
  'NO_STOCK_LISTED',
  'RATE_ABOVE_MARKET',
  'CONDITION_MISMATCH',
  'OTHER',
] as const;
export type AskReason = (typeof ASK_REASONS)[number];

export const ASK_REASON_LABELS: Record<AskReason, string> = {
  NO_STOCK_LISTED: 'Not on the board',
  RATE_ABOVE_MARKET: 'Our rate is above the market',
  CONDITION_MISMATCH: 'Needs a different condition (expiry, batch…)',
  OTHER: 'Other',
};

export const DECLINE_REASONS = ['NO_STOCK', 'RATE_CHANGED', 'EXPIRY_TOO_SHORT', 'OTHER'] as const;
export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const DECLINE_REASON_LABELS: Record<DeclineReason, string> = {
  NO_STOCK: 'No stock',
  RATE_CHANGED: 'Rate changed',
  EXPIRY_TOO_SHORT: 'Expiry too short',
  OTHER: 'Other',
};

/** The engine's actions (server: modules/trades/actions.ts). The server says which ones a trade shows. */
export const TRADE_ACTION_NAMES = [
  'wantIt',
  'sendToSeller',
  'giveQuote',
  'confirmStock',
  'declineStock',
  'sendToBuyer',
  'buyerYes',
  'buyerNo',
  'leakAfterOrder',
  'reopen',
] as const;
export type TradeActionName = (typeof TRADE_ACTION_NAMES)[number];
