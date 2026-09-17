import { apiFetch } from './client';

export function recordFailure(
  accessToken: string,
  input: {
    counterpartyId: string;
    counterpartyKind: 'buyer' | 'seller';
    type: string;
    viaFraud?: boolean;
  },
): Promise<{ failureEventId: string; stage: string; blacklisted: boolean }> {
  return apiFetch('/staff/conduct/failures', { method: 'POST', body: input, accessToken });
}

export function advanceConductStage(
  accessToken: string,
  failureEventId: string,
  input: { toStage: string; reason: string; checkerEmployeeId: string },
): Promise<{ stage: string; blacklisted: boolean }> {
  return apiFetch(`/staff/conduct/failures/${failureEventId}/advance`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export interface ConductHistoryItem {
  failureEventId: string;
  type: string;
  stage: string;
  withinGrace: boolean;
  disputed: boolean;
  at: string;
  decaysAt: string | null;
}

export function getConductHistory(
  accessToken: string,
  counterpartyId: string,
): Promise<ConductHistoryItem[]> {
  return apiFetch(`/staff/conduct/counterparties/${counterpartyId}/history`, { accessToken });
}

export interface DisagreementQueueItem {
  failureEventId: string;
  counterpartyId: string;
  counterpartyKind: 'buyer' | 'seller';
  type: string;
  stage: string;
  at: string;
}

export function getDisagreementQueue(accessToken: string): Promise<DisagreementQueueItem[]> {
  return apiFetch('/staff/conduct/disagreements', { accessToken });
}
