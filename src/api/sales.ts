import { apiFetch } from './client';

export interface SalesWorkItem {
  bucket: 'money' | 'promised' | 'he_asked' | 'market';
  refType: 'so' | 'po' | 'ask' | 'quote';
  refId: string;
  buyerId?: string;
  dueAt?: string;
}

export function getSalesWorklist(accessToken: string): Promise<SalesWorkItem[]> {
  return apiFetch('/staff/sales/worklist', { accessToken });
}

export interface PulseCell {
  areaTehsilId: string;
  productId: string;
  status: 'rising' | 'falling' | 'steady';
  now: number;
  before: number;
}

export function getMarketPulse(accessToken: string): Promise<PulseCell[]> {
  return apiFetch('/staff/sales/pulse', { accessToken });
}

export interface RetentionCohort {
  month: string;
  firstOrderCount: number;
  retainedCount: number;
  retentionPct: number;
}

export function getRetention(accessToken: string): Promise<RetentionCohort[]> {
  return apiFetch('/staff/sales/retention', { accessToken });
}

// Corrected M7 (QR-048/BR-206) — Controller decides disputes, not an
// execution desk directly; `'unhandled'` is `transit_damage` (QR-050).
export interface ComplaintQueueItem {
  complaintId: string;
  soId: string;
  category: string;
  destination: 'controller' | 'unhandled';
  state: string;
  createdAt: string;
  disposition: string | null;
  resolutionNote: string | null;
}

export function getComplaintQueue(accessToken: string): Promise<ComplaintQueueItem[]> {
  return apiFetch('/staff/sales/complaints', { accessToken });
}

export interface MspQueueItem {
  mspRequestId: string;
  buyerId: string;
  skuId: string;
  qty: number;
  status: string;
}

export function getMspQueue(accessToken: string): Promise<MspQueueItem[]> {
  return apiFetch('/staff/sales/msp', { accessToken });
}

export function respondToMsp(
  accessToken: string,
  mspRequestId: string,
  decision: { granted: boolean; refusalCode?: string },
): Promise<{ done: boolean }> {
  return apiFetch(`/staff/sales/msp/${mspRequestId}/respond`, {
    method: 'POST',
    body: decision,
    accessToken,
  });
}
