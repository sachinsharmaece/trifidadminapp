import { apiFetch } from './client';

/**
 * Phase 5 (DEC-060) — the two ways past the visibility wall: the exact
 * lookup (firm, side and leader only) and Change owner.
 */
export interface LeadLookupMatch {
  firm: string;
  side: 'buyer' | 'seller';
  leader: string | null;
  inQueue: boolean;
  /** Only when the caller may open his file anyway. */
  profileId: string | null;
}

export type LeadLookupBy = 'gstin' | 'pan' | 'mobile';

export function lookupLead(
  accessToken: string,
  by: LeadLookupBy,
  value: string,
): Promise<LeadLookupMatch[]> {
  const query = new URLSearchParams({ [by]: value });
  return apiFetch(`/staff/lookup?${query.toString()}`, { accessToken });
}

export interface ChangeOwnerInput {
  /** null puts him back in the Queue. */
  ownerEmployeeId: string | null;
  note?: string;
}

export function changeOwner(
  accessToken: string,
  side: 'buyer' | 'seller',
  profileId: string,
  input: ChangeOwnerInput,
  idempotencyKey: string,
): Promise<{ ownerEmployeeId: string | null; owner: string | null }> {
  return apiFetch(`/staff/${side}s/${profileId}/owner`, {
    method: 'POST',
    body: input,
    accessToken,
    idempotencyKey,
  });
}
