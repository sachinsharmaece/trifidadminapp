import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import {
  JOURNAL_KINDS,
  JOURNAL_STATUSES,
  type JournalKind,
  type JournalStatus,
} from '@/types/books';

/**
 * Hand-typed journal entries and opening balances. A person types one, a DIFFERENT person approves it (then it is
 * posted to the books), the maker may withdraw it while it waits. A posted one is undone by a reversal.
 */
const journalSchema = z.object({
  id: z.string(),
  number: z.string(),
  kind: z.enum(JOURNAL_KINDS),
  status: z.enum(JOURNAL_STATUSES),
  version: z.number(),
  date: z.string(),
  narration: z.string(),
  totalPaise: z.number(),
  lines: z.array(
    z.object({
      ledgerId: z.string(),
      ledgerName: z.string(),
      drPaise: z.number(),
      crPaise: z.number(),
    }),
  ),
  createdBy: z.string().nullable(),
  createdAt: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  rejectedBy: z.string().nullable(),
  rejectNote: z.string().nullable(),
  reversedBy: z.string().nullable(),
  reverseNote: z.string().nullable(),
  voucherNumber: z.string().nullable(),
  reverseVoucherNumber: z.string().nullable(),
  /** Maker ≠ checker: the person who typed it cannot approve or reject it, but may cancel it. */
  typedByMe: z.boolean(),
});
export type Journal = z.infer<typeof journalSchema>;

export interface JournalListParams {
  status: JournalStatus | '';
  kind: JournalKind | '';
  q: string;
  page: number;
  pageSize: number;
}

export async function listJournals(params: JournalListParams, signal?: AbortSignal) {
  const { status, kind, ...rest } = params;
  const { data } = await apiClient.get<unknown>('/journals', {
    params: { ...rest, ...(status ? { status } : {}), ...(kind ? { kind } : {}) },
    signal,
  });
  return z
    .object({
      journals: z.array(journalSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

/** One typed line: a ledger, or a buyer / seller who has no ledger yet (it is made when the entry is typed). */
export interface JournalLineInput {
  ledgerId?: string;
  party?: { side: 'BUYER' | 'SELLER'; id: string };
  drPaise: number;
  crPaise: number;
}
export interface JournalInput {
  kind: JournalKind;
  date: string;
  narration: string;
  lines: JournalLineInput[];
}

const oneSchema = z.object({ journal: journalSchema });

export async function createJournal(input: JournalInput) {
  const { data } = await apiClient.post<unknown>('/journals', input);
  return oneSchema.parse(data).journal;
}

export async function approveJournal(journal: Journal) {
  const { data } = await apiClient.post<unknown>(`/journals/${journal.id}/approve`, {
    version: journal.version,
  });
  return oneSchema.parse(data).journal;
}

export async function rejectJournal(journal: Journal, note: string) {
  const { data } = await apiClient.post<unknown>(`/journals/${journal.id}/reject`, {
    version: journal.version,
    note,
  });
  return oneSchema.parse(data).journal;
}

export async function cancelJournal(journal: Journal) {
  const { data } = await apiClient.post<unknown>(`/journals/${journal.id}/cancel`, {
    version: journal.version,
  });
  return oneSchema.parse(data).journal;
}

/** What the line picker offers: ledgers, and buyers / sellers who have no ledger yet. */
const choiceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('LEDGER'),
    ledgerId: z.string(),
    name: z.string(),
    group: z.string(),
  }),
  z.object({
    kind: z.literal('PARTY'),
    side: z.enum(['BUYER', 'SELLER']),
    id: z.string(),
    name: z.string(),
  }),
]);
export type LedgerChoice = z.infer<typeof choiceSchema>;

export async function listLedgerChoices(q: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/ledger-choices', { params: { q }, signal });
  return z.object({ choices: z.array(choiceSchema) }).parse(data).choices;
}
