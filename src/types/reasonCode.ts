/** Must match REASON_CODE_CONTEXTS in the server (shared/enums.ts). */
export const REASON_CODE_CONTEXTS = [
  'BUYER_NO',
  'B6_LEAK',
  'CANCEL_SO',
  'REFUND',
  'COMPLAINT',
  'MARG_QUERY',
  'SELL_LEAD_REJECT',
  'CALL_OUTCOME',
] as const;
export type ReasonCodeContext = (typeof REASON_CODE_CONTEXTS)[number];

/** Where each group of reasons is offered: a reason shows up only in the dropdown of its own context. */
export const CONTEXT_LABELS: Record<ReasonCodeContext, string> = {
  BUYER_NO: 'Buyer said no',
  B6_LEAK: 'Lost at stage B6',
  CANCEL_SO: 'Sales order cancelled',
  REFUND: 'Refund',
  COMPLAINT: 'Complaint',
  MARG_QUERY: 'Marg query',
  SELL_LEAD_REJECT: 'Seller lead rejected',
  CALL_OUTCOME: 'Call outcome',
};
