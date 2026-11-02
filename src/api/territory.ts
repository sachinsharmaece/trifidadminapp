import { apiFetch } from './client';
import type {
  DistrictDto,
  PincodeListItemDto,
  PincodeLocationDto,
  StateDto,
  TehsilDto,
} from './dto';

// Phase 1 location masters. Every write takes the form kit's Idempotency-Key
// (the server requires one on each of them).

export function getStates(accessToken: string): Promise<StateDto[]> {
  return apiFetch('/admin/states', { accessToken });
}

export function createState(
  accessToken: string,
  input: { name: string; gstStateCode: string },
  idempotencyKey: string,
): Promise<StateDto> {
  return apiFetch('/admin/states', { method: 'POST', body: input, accessToken, idempotencyKey });
}

export function getDistricts(accessToken: string, stateId?: string): Promise<DistrictDto[]> {
  const query = stateId ? `?stateId=${encodeURIComponent(stateId)}` : '';
  return apiFetch(`/admin/districts${query}`, { accessToken });
}

export function createDistrict(
  accessToken: string,
  input: { name: string; stateId: string },
  idempotencyKey: string,
): Promise<DistrictDto> {
  return apiFetch('/admin/districts', { method: 'POST', body: input, accessToken, idempotencyKey });
}

// API-026
export function getTehsils(
  accessToken: string,
  filter: { districtId?: string } = {},
): Promise<TehsilDto[]> {
  const query = filter.districtId ? `?districtId=${encodeURIComponent(filter.districtId)}` : '';
  return apiFetch(`/admin/tehsils${query}`, { accessToken });
}

export function createTehsil(
  accessToken: string,
  input: { name: string; districtId: string },
  idempotencyKey: string,
): Promise<{ tehsilId: string }> {
  return apiFetch('/admin/tehsils', { method: 'POST', body: input, accessToken, idempotencyKey });
}

export function updateTehsil(
  accessToken: string,
  tehsilId: string,
  input: { name?: string; districtId?: string },
  idempotencyKey: string,
): Promise<TehsilDto> {
  return apiFetch(`/admin/tehsils/${tehsilId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
    idempotencyKey,
  });
}

/** A known pincode's place, or null when the master has never seen it. */
export function lookupPincode(
  accessToken: string,
  pincode: string,
): Promise<PincodeLocationDto | null> {
  return apiFetch(`/admin/pincodes/${encodeURIComponent(pincode)}`, { accessToken });
}

export function getPincodes(
  accessToken: string,
  status?: 'verified' | 'unverified',
): Promise<PincodeListItemDto[]> {
  return apiFetch(`/admin/pincodes${status ? `?status=${status}` : ''}`, { accessToken });
}

export function updatePincode(
  accessToken: string,
  pincode: string,
  input: { tehsilId?: string; verify?: true },
  idempotencyKey: string,
): Promise<PincodeLocationDto> {
  return apiFetch(`/admin/pincodes/${encodeURIComponent(pincode)}`, {
    method: 'PATCH',
    body: input,
    accessToken,
    idempotencyKey,
  });
}
