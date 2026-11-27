import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import type { ArrivalInput, InspectionInput } from '@/features/trades/api';
import { queryClient } from '@/services/query/queryClient';
import {
  closeReturnNote,
  correctInspection,
  inspect,
  listDock,
  listReturnNotes,
  recordArrival,
  type CloseReturnNoteInput,
  type DockParams,
  type DockRow,
  type ReturnNote,
  type ReturnNoteParams,
} from './api';

/** Under ['trades'], so pressing here also refreshes deal cards, funnels, POs and orders. */
const refresh = () => {
  void queryClient.invalidateQueries({ queryKey: ['trades'] });
  void queryClient.invalidateQueries({ queryKey: ['ledgers'] });
};

export function useDock(params: DockParams) {
  return useQuery({
    queryKey: ['trades', 'dock', params],
    queryFn: ({ signal }) => listDock(params, signal),
    staleTime: 0, // Purchase may have just recorded a dispatch
    placeholderData: keepPreviousData,
  });
}

export function useRecordArrival() {
  return useMutation({
    mutationFn: (input: { row: DockRow; arrival: ArrivalInput }) =>
      recordArrival(input.row, input.arrival),
    onSettled: refresh, // also after a 409: someone else may have handled the row
  });
}

export function useInspect() {
  return useMutation({
    mutationFn: (input: { row: DockRow; inspection: InspectionInput }) =>
      inspect(input.row, input.inspection),
    onSettled: refresh,
  });
}

export function useCorrectInspection() {
  return useMutation({
    mutationFn: (input: { row: DockRow; inspection: InspectionInput }) =>
      correctInspection(input.row, input.inspection),
    onSettled: refresh,
  });
}

export function useReturnNotes(params: ReturnNoteParams) {
  return useQuery({
    queryKey: ['trades', 'return-notes', params],
    queryFn: ({ signal }) => listReturnNotes(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useCloseReturnNote() {
  return useMutation({
    mutationFn: (input: { note: ReturnNote; close: CloseReturnNoteInput }) =>
      closeReturnNote(input.note, input.close),
    onSettled: refresh,
  });
}
