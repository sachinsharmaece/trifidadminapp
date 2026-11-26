import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import { BOOK_WITH_MODES, TRIP_STATUSES, type BookWithMode, type TripStatus } from '@/types/dock';

/**
 * Trips (Logistics; leg 2). No buyer names or money: a bill is its order and Marg numbers, the destination
 * (delivery place and tehsil), boxes and items. Adding, removing and checking out change only the trip; the POD
 * presses the engine action `recordPod` with the bill's trade version.
 */
const billedSchema = z.object({
  salesOrderId: z.string(),
  soNumber: z.string(),
  tradeId: z.string(),
  margInvoiceNumber: z.string(),
  ewayBillNumber: z.string().nullable(),
  billDate: z.string().nullable(),
  destination: z.string(),
  boxes: z.number(),
  items: z.array(
    z.object({
      lineNo: z.number(),
      productName: z.string(),
      packLabel: z.string(),
      boxes: z.number(),
      batch: z.string().nullable(),
      expiryMonth: z.string().nullable(),
    }),
  ),
});
export type BilledBill = z.infer<typeof billedSchema>;

const tripSchema = z.object({
  id: z.string(),
  code: z.string(),
  plannedDate: z.string(),
  vehicleNumber: z.string(),
  driverName: z.string(),
  driverMobile: z.string(),
  status: z.enum(TRIP_STATUSES),
  bills: z.array(
    z.object({
      salesOrderId: z.string(),
      soNumber: z.string(),
      tradeId: z.string(),
      tradeVersion: z.number().nullable(),
      margInvoiceNumber: z.string(),
      destination: z.string(),
      boxes: z.number(),
      bookWith: z.object({ mode: z.enum(BOOK_WITH_MODES), transporter: z.string().nullable() }),
      pod: z.object({ ref: z.string(), date: z.string(), at: z.string() }).nullable(),
    }),
  ),
  whatsappText: z.string().nullable(),
  checkedOutAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  version: z.number(),
});
export type Trip = z.infer<typeof tripSchema>;
export type TripBill = Trip['bills'][number];

const page = { total: z.number(), page: z.number(), pageSize: z.number() };
const oneTrip = z.object({ trip: tripSchema });

export async function listBilled(
  params: { q: string; page: number; pageSize: number },
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<unknown>('/trips/billed', { params, signal });
  return z.object({ bills: z.array(billedSchema), ...page }).parse(data);
}

export async function listTrips(
  params: { status: TripStatus; q: string; page: number; pageSize: number },
  signal?: AbortSignal,
) {
  const { data } = await apiClient.get<unknown>('/trips', { params, signal });
  return z.object({ trips: z.array(tripSchema), ...page }).parse(data);
}

export interface NewTripInput {
  plannedDate: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
}

export async function createTrip(input: NewTripInput) {
  const { data } = await apiClient.post<unknown>('/trips', input);
  return oneTrip.parse(data).trip;
}

export async function addBill(
  trip: Pick<Trip, 'id' | 'version'>,
  input: { salesOrderId: string; bookWith: { mode: BookWithMode; transporter?: string } },
) {
  const { data } = await apiClient.post<unknown>(`/trips/${trip.id}/bills`, {
    version: trip.version,
    ...input,
  });
  return oneTrip.parse(data).trip;
}

export async function removeBill(trip: Trip, salesOrderId: string) {
  const { data } = await apiClient.post<unknown>(`/trips/${trip.id}/bills/${salesOrderId}/remove`, {
    version: trip.version,
  });
  return oneTrip.parse(data).trip;
}

export async function checkOut(trip: Trip) {
  const { data } = await apiClient.post<unknown>(`/trips/${trip.id}/check-out`, {
    version: trip.version,
  });
  return oneTrip.parse(data).trip;
}

/** The engine action "Proof of dispatch" for one bill. */
export async function recordPod(trip: Trip, bill: TripBill, input: { ref: string; date: string }) {
  const { data } = await apiClient.post<unknown>(
    `/trips/${trip.id}/bills/${bill.salesOrderId}/pod`,
    {
      version: bill.tradeVersion,
      ...input,
    },
  );
  return oneTrip.parse(data).trip;
}
