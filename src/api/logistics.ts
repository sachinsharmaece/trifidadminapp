import { apiFetch } from './client';

export interface TransporterDto {
  transporterId: string;
  name: string;
  mobile: string | null;
  vehicleType: string | null;
  active: boolean;
}

export function createTransporter(
  accessToken: string,
  input: { name: string; mobile?: string; vehicleType?: string; notes?: string },
): Promise<TransporterDto> {
  return apiFetch('/staff/logistics/transporters', { method: 'POST', body: input, accessToken });
}

export function getTransporters(accessToken: string): Promise<TransporterDto[]> {
  return apiFetch('/staff/logistics/transporters', { accessToken });
}

export function recordGoodsIn(accessToken: string, poId: string): Promise<{ receivedAt: string }> {
  return apiFetch(`/staff/logistics/pos/${poId}/goods-in`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}

export interface HubPositionItem {
  poId: string;
  receivedAt: string;
  dwellHours: number;
  inspected: boolean;
  dispatchEligibleToday: boolean;
}

export function getHubPosition(accessToken: string): Promise<HubPositionItem[]> {
  return apiFetch('/staff/logistics/hub-position', { accessToken });
}

export interface ConsolidationDto {
  consolidationId: string;
  consolidationNo: string;
  movementIds: string[];
}

export function createConsolidation(
  accessToken: string,
  movementIds: string[],
): Promise<ConsolidationDto> {
  return apiFetch('/staff/logistics/consolidations', {
    method: 'POST',
    body: { movementIds },
    accessToken,
  });
}

export function arrangeReturnCollection(
  accessToken: string,
  returnNoteId: string,
): Promise<{ collectionArrangedAt: string }> {
  return apiFetch(`/staff/logistics/return-notes/${returnNoteId}/arrange-collection`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}

export function closeReturnNote(
  accessToken: string,
  returnNoteId: string,
): Promise<{ returnedAt: string }> {
  return apiFetch(`/staff/logistics/return-notes/${returnNoteId}/close`, {
    method: 'POST',
    body: {},
    accessToken,
  });
}

export interface LogisticsDashboard {
  atHubCount: number;
  overdueDispatchCount: number;
  openReturnNotes: number;
  overdueReturnNotes: number;
  hubPosition: HubPositionItem[];
}

export function getLogisticsDashboard(accessToken: string): Promise<LogisticsDashboard> {
  return apiFetch('/staff/logistics/dashboard', { accessToken });
}
