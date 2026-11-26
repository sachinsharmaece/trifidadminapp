import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import type { BookWithMode, TripStatus } from '@/types/dock';
import {
  addBill,
  checkOut,
  createTrip,
  listBilled,
  listTrips,
  recordPod,
  removeBill,
  type NewTripInput,
  type Trip,
  type TripBill,
} from './api';

/** Under ['trades']: a POD moves a deal card; every trip change refreshes both lists. */
const refresh = () => void queryClient.invalidateQueries({ queryKey: ['trades'] });

export function useBilled(params: { q: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['trades', 'trips-billed', params],
    queryFn: ({ signal }) => listBilled(params, signal),
    staleTime: 0, // Accounts may have just billed an order
    placeholderData: keepPreviousData,
  });
}

export function useTrips(params: {
  status: TripStatus;
  q: string;
  page: number;
  pageSize: number;
}) {
  return useQuery({
    queryKey: ['trades', 'trips', params],
    queryFn: ({ signal }) => listTrips(params, signal),
    placeholderData: keepPreviousData,
  });
}

/** Only PLANNED trips, for the "Add to trip" picker. */
export function usePlannedTrips() {
  return useTrips({ status: 'PLANNED', q: '', page: 1, pageSize: 100 });
}

export function useCreateTrip() {
  return useMutation({
    mutationFn: (input: NewTripInput) => createTrip(input),
    onSettled: refresh,
  });
}

export function useAddBill() {
  return useMutation({
    mutationFn: (input: {
      trip: Pick<Trip, 'id' | 'version'>;
      salesOrderId: string;
      bookWith: { mode: BookWithMode; transporter?: string };
    }) => addBill(input.trip, { salesOrderId: input.salesOrderId, bookWith: input.bookWith }),
    onSettled: refresh,
  });
}

export function useRemoveBill() {
  return useMutation({
    mutationFn: (input: { trip: Trip; salesOrderId: string }) =>
      removeBill(input.trip, input.salesOrderId),
    onSettled: refresh,
  });
}

export function useCheckOut() {
  return useMutation({ mutationFn: (trip: Trip) => checkOut(trip), onSettled: refresh });
}

export function useRecordPod() {
  return useMutation({
    mutationFn: (input: { trip: Trip; bill: TripBill; pod: { ref: string; date: string } }) =>
      recordPod(input.trip, input.bill, input.pod),
    onSettled: refresh,
  });
}
