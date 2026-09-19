import { apiFetch } from './client';
import type { ExceptionView } from './controller';
import type { FunnelReport } from './purchase';

// M8 — read-only. There is deliberately no write call in this file.
export interface BuyerMoneyHeld {
  heldPaise: number;
  undeliveredOrdersPaise: number;
  pendingRefundsPaise: number;
  formula: string;
}

export interface FounderOverview {
  asOf: string;
  buyerMoneyHeld: BuyerMoneyHeld;
  exceptions: ExceptionView;
  funnel: FunnelReport;
}

export function getFounderOverview(accessToken: string): Promise<FounderOverview> {
  return apiFetch('/founder/overview', { accessToken });
}
