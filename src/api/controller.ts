import { apiFetch } from './client';

// M7, BR-206 — "Controller decides disputes." `transit_damage` never appears
// here this session (QR-050).
export interface DisputeQueueItem {
  complaintId: string;
  soId: string;
  category: string;
  note: string | null;
  createdAt: string;
}

export function getDisputeQueue(accessToken: string): Promise<DisputeQueueItem[]> {
  return apiFetch('/staff/controller/disputes', { accessToken });
}

export function decideDispute(
  accessToken: string,
  complaintId: string,
  input: {
    disposition: 'seller_fault' | 'dock_fault' | 'no_fault';
    note: string;
    debitValuePaise?: number;
  },
): Promise<{ debitNoteId?: string; soClosed: boolean }> {
  return apiFetch(`/staff/controller/disputes/${complaintId}/decide`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export interface ExceptionView {
  openDisputes: number;
  unhandledTransitDamage: number;
  overdueReturnNotes: number;
  blacklistedWithPendingPayables: Array<{ counterpartyId: string; poId: string }>;
}

export function getExceptionView(accessToken: string): Promise<ExceptionView> {
  return apiFetch('/staff/controller/exceptions', { accessToken });
}

// BR-234 — maker-checker via checkerEmployeeId; the route's own middleware
// does not verify the two are different people (see controller.service.ts).
export function grantBulkLifeline(
  accessToken: string,
  input: { extensionHours: number; reason: string; checkerEmployeeId: string },
): Promise<{ extendedPoCount: number; newDispatchDueDate: string }> {
  return apiFetch('/staff/controller/lifeline/bulk', { method: 'POST', body: input, accessToken });
}
