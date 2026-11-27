import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  approveJournal,
  cancelJournal,
  createJournal,
  listJournals,
  listLedgerChoices,
  rejectJournal,
  type Journal,
  type JournalInput,
  type JournalListParams,
} from './api';

/** A journal changes the books, so the lists that read the books are refreshed too. */
export const refreshBooks = () => {
  void queryClient.invalidateQueries({ queryKey: ['journals'] });
  void queryClient.invalidateQueries({ queryKey: ['vouchers'] });
  void queryClient.invalidateQueries({ queryKey: ['ledgers'] });
  void queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
  void queryClient.invalidateQueries({ queryKey: ['trades'] }); // registers, trial balance and the dashboard
};

export function useJournals(params: JournalListParams) {
  return useQuery({
    queryKey: ['journals', params],
    queryFn: ({ signal }) => listJournals(params, signal),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useCreateJournal() {
  return useMutation({
    mutationFn: (input: JournalInput) => createJournal(input),
    onSettled: refreshBooks,
  });
}

export function useApproveJournal() {
  return useMutation({
    mutationFn: (journal: Journal) => approveJournal(journal),
    onSettled: refreshBooks,
  });
}

export function useRejectJournal() {
  return useMutation({
    mutationFn: (input: { journal: Journal; note: string }) =>
      rejectJournal(input.journal, input.note),
    onSettled: refreshBooks,
  });
}

export function useCancelJournal() {
  return useMutation({
    mutationFn: (journal: Journal) => cancelJournal(journal),
    onSettled: refreshBooks,
  });
}

/** The line picker's matches (the first 40 ledgers when nothing is typed). */
export function useLedgerChoices(q: string) {
  return useQuery({
    queryKey: ['journals', 'ledger-choices', q],
    queryFn: ({ signal }) => listLedgerChoices(q, signal),
    staleTime: 10_000,
    placeholderData: keepPreviousData,
  });
}
