import { apiFetch } from './client';

/**
 * LOCK-34 — dormant parties, lead intake and the Pool. Everything here answers
 * 403 "Dormant policy is switched off." while the policy is off, except
 * `getHoldingStatus`, which the screens call to find that out.
 */
export interface HoldingStatus {
  enabled: boolean;
  isCaller: boolean;
  isTeamLeader: boolean;
  uncalledCap: number;
}

export function getHoldingStatus(accessToken: string): Promise<HoldingStatus> {
  return apiFetch('/staff/sales/holdings/status', { accessToken });
}

export type HoldingKind = 'lead' | 'claim' | 'book';

export type ReleaseReason =
  | 'asked_for_a_rate'
  | 'wants_something_we_dont_stock'
  | 'rate_too_high'
  | 'already_holds_stock'
  | 'buys_direct_from_company'
  | 'not_now_call_later'
  | 'no_answer'
  | 'wrong_number';

export interface HoldingInfo {
  holdingId: string;
  kind: HoldingKind;
  via: string;
  startedAt: string;
  /** No call by its holder since it started. */
  uncalled: boolean;
  /** Intake leads while uncalled: when the first call is due. */
  callDueAt: string | null;
  /** When the reason window opens. */
  clockEndsAt: string | null;
  windowOpenedAt: string | null;
  releasesAt: string | null;
  reason: ReleaseReason | null;
  backlog: boolean;
}

export interface MyHoldingRow extends HoldingInfo {
  buyerId: string;
  firm: string;
  tehsil: string | null;
  district: string | null;
  state: string | null;
}

export function getMyHoldings(
  accessToken: string,
): Promise<{ items: MyHoldingRow[]; uncalled: number; cap: number }> {
  return apiFetch('/staff/sales/holdings/mine', { accessToken });
}

export function logReason(
  accessToken: string,
  holdingId: string,
  reason: ReleaseReason,
  idempotencyKey: string,
): Promise<{ ok: true }> {
  return apiFetch(`/staff/sales/holdings/${holdingId}/reason`, {
    method: 'POST',
    body: { reason },
    accessToken,
    idempotencyKey,
  });
}

// ---------------------------------------------------------------------------
// The Pool
// ---------------------------------------------------------------------------

export interface PreviousHolder {
  holder: string;
  from: string;
  to: string | null;
  reason: ReleaseReason | null;
  /** Released with no reason logged: shown as "owner did not diagnose". */
  systemMarked: boolean;
}

export interface PoolCard {
  buyerId: string;
  firm: string;
  tehsil: string | null;
  district: string | null;
  /** Shown in place of the tehsil when it has none. */
  state: string | null;
  section: 'ordered' | 'new';
  enteredAt: string;
  previousHolders: PreviousHolder[];
}

export interface PoolPage {
  counts: { ordered: number; new: number };
  items: PoolCard[];
  total: number;
  claim: { allowed: boolean; reason: string | null };
}

export function getPool(
  accessToken: string,
  params: { section: 'ordered' | 'new'; q?: string; offset?: number; limit?: number },
): Promise<PoolPage> {
  const query = new URLSearchParams({ section: params.section });
  if (params.q) query.set('q', params.q);
  if (params.offset) query.set('offset', String(params.offset));
  if (params.limit) query.set('limit', String(params.limit));
  return apiFetch(`/staff/sales/party-pool?${query.toString()}`, { accessToken });
}

export function claimParty(
  accessToken: string,
  partyId: string,
  idempotencyKey: string,
): Promise<{ holdingId: string }> {
  return apiFetch(`/staff/sales/party-pool/${partyId}/claim`, {
    method: 'POST',
    accessToken,
    idempotencyKey,
  });
}

// ---------------------------------------------------------------------------
// The Team Leader
// ---------------------------------------------------------------------------

export interface DeskCard extends PoolCard {
  daysWaiting: number;
  lastHolderId: string | null;
}

export interface DeskCaller {
  employeeId: string;
  person: string;
  uncalled: number;
  cap: number;
  receivingLeads: boolean;
  canSwitch: boolean;
}

export function getWaiting(
  accessToken: string,
): Promise<{ items: DeskCard[]; callers: DeskCaller[]; unclaimedDays: number }> {
  return apiFetch('/staff/sales/party-pool/waiting', { accessToken });
}

export function assignFromPool(
  accessToken: string,
  partyId: string,
  callerId: string,
  idempotencyKey: string,
): Promise<{ holdingId: string }> {
  return apiFetch(`/staff/sales/party-pool/${partyId}/assign`, {
    method: 'POST',
    body: { callerId },
    accessToken,
    idempotencyKey,
  });
}

export function leavePool(
  accessToken: string,
  partyId: string,
  idempotencyKey: string,
): Promise<{ ok: true }> {
  return apiFetch(`/staff/sales/party-pool/${partyId}/leave`, {
    method: 'POST',
    accessToken,
    idempotencyKey,
  });
}

export function setReceivingLeads(
  accessToken: string,
  staffId: string,
  on: boolean,
  idempotencyKey: string,
): Promise<{ ok: true }> {
  return apiFetch(`/staff/sales/callers/${staffId}/receiving-leads`, {
    method: 'PUT',
    body: { on },
    accessToken,
    idempotencyKey,
  });
}

// ---------------------------------------------------------------------------
// Admin: the Dormant policy page
// ---------------------------------------------------------------------------

export interface Season {
  name: string;
  fromMonth: number;
  toMonth: number;
}

export interface PolicySettings {
  enabled: boolean;
  goLiveDate: string | null;
  orderedDays: number;
  /** In paise, like every sales-order amount. */
  billingThresholdPaise: number;
  reasonWindowDays: number;
  uncalledCap: number;
  firstCallWorkingHours: number;
  leadDays: number;
  unclaimedDays: number;
  backlogPerWeek: number;
  seasons: Season[];
}

export interface PolicyView {
  settings: PolicySettings;
  /** Whether the nightly check is switched on at the server (DORMANCY_JOB_ENABLED). */
  nightlyJobEnabled: boolean;
}

export function getPolicy(accessToken: string): Promise<PolicyView> {
  return apiFetch('/admin/dormancy-policy', { accessToken });
}

export function updatePolicy(
  accessToken: string,
  patch: Partial<PolicySettings>,
  idempotencyKey: string,
): Promise<PolicyView> {
  return apiFetch('/admin/dormancy-policy', {
    method: 'PUT',
    body: patch,
    accessToken,
    idempotencyKey,
  });
}
