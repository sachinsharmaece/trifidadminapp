import { refGet } from '@/lib/refApi';
import { ApiError } from '@/services/api/ApiError';

/** Shapes and helpers shared by the dormant-policy screens (reference components/dormancy, lib/dormancy). */

export interface HoldingRow {
  id: string;
  partyId: string;
  partyName: string;
  tehsil: string | null;
  district: string;
  kind: 'LEAD' | 'CLAIM' | 'BOOK';
  via: string;
  startedAt: string;
  windowOpenedAt: string | null;
  uncalled: boolean;
  firstCallDueAt: string | null;
  releasingInDays: number | null;
}

export interface UncalledCount {
  count: number;
  cap: number;
}

export interface HoldingsResponse {
  holdings: HoldingRow[];
  uncalled: UncalledCount;
}

export interface PoolCardData {
  partyId: string;
  partyName: string;
  tehsil: string | null;
  district: string;
  state: string;
  poolEnteredAt: string;
  previousHolders: { name: string; from: string; to: string | null; reason: string }[];
  canClaim: boolean;
  claimRefusedReason: string | null;
}

/** The 8 reasons the reason picker offers (reference lib/dormancy/reasons.ts). */
export const RELEASE_REASONS = [
  { value: 'ASKED_FOR_RATE', label: 'Asked for a rate' },
  { value: 'NO_STOCK', label: "Wants something we don't have" },
  { value: 'PRICE_OBJECTION', label: 'Rate too high' },
  { value: 'ALREADY_HOLDS_STOCK', label: 'Already holds stock' },
  { value: 'BUYS_DIRECT', label: 'Buys direct from the company' },
  { value: 'CALLBACK_LATER', label: 'Not now, call later' },
  { value: 'NO_ANSWER', label: 'No answer' },
  { value: 'WRONG_NUMBER', label: 'Wrong number' },
];

/** "3.5h remaining" or "overdue by 2h", never a negative number (reference lib/dates.ts formatWindowStatus). */
export function formatWindowStatus(deadline: Date, now: Date = new Date()) {
  const diffMs = deadline.getTime() - now.getTime();
  const hours = Math.round((Math.abs(diffMs) / (1000 * 60 * 60)) * 10) / 10;
  if (diffMs < 0) return { overdue: true, label: `overdue by ${hours}h` };
  return { overdue: false, label: `${hours}h remaining` };
}

/** Whole Indian calendar days from `iso` to now. */
export function daysAgoIST(iso: string): number {
  const IST = 5.5 * 60 * 60 * 1000;
  const DAY = 24 * 60 * 60 * 1000;
  const day = (ms: number) => Math.floor((ms + IST) / DAY);
  return day(Date.now()) - day(new Date(iso).getTime());
}

/** A GET that gives the server's message instead of throwing (the reference reads errors with readApiError). */
export async function getOrError<T>(
  path: string,
  params?: object,
): Promise<{ data: T } | { error: string }> {
  try {
    return { data: await refGet<T>(path, params) };
  } catch (error) {
    return {
      error: error instanceof ApiError ? error.message : 'Something went wrong. Try again.',
    };
  }
}

export interface DormancyMe {
  enabled: boolean;
  isCaller: boolean;
  isTeamLeader: boolean;
}
