/** What kind of trader a buyer is. A copy of TRADE_POSITIONS in trifidserverapp/src/shared/enums.ts: change both together. */
export const TRADE_POSITIONS = ['DISTRIBUTOR', 'DEALER', 'RETAILER'] as const;

export type TradePosition = (typeof TRADE_POSITIONS)[number];

/** The rate tier decides which selling rate a buyer sees. The trader flag overrides the trade position. */
export type RateTier = TradePosition | 'TRADER';

export const RATE_TIER_LABELS: Record<RateTier, string> = {
  DISTRIBUTOR: 'Distributor',
  DEALER: 'Dealer',
  RETAILER: 'Retailer',
  TRADER: 'Trader',
};
