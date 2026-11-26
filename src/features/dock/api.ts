import { z } from 'zod';
import type { ArrivalInput, InspectionInput } from '@/features/trades/api';
import { apiClient } from '@/services/api/client';
import {
  FREIGHT_TERMS,
  INSPECTION_OUTCOMES,
  LEG1_MODES,
  PURCHASE_ORDER_STATUSES,
  RETURN_CLOSURES,
  RETURN_NOTE_TYPES,
  type ReturnClosure,
} from '@/types/dock';

/**
 * The Logistics dock and return notes. The dock never shows firm names or money (SRS-LOG-01): a row is a PO
 * number, where the goods come from (the seller's tehsil), the items, boxes, batch and expiry, and the transport.
 * "Goods arrived" and "Check the goods" press the same engine actions as the deal card, with the trade's version.
 */
const dockRowSchema = z.object({
  purchaseOrderId: z.string(),
  number: z.string(),
  status: z.enum(PURCHASE_ORDER_STATUSES),
  tradeId: z.string(),
  tradeVersion: z.number().nullable(),
  from: z.string(),
  boxes: z.number(),
  lines: z.array(
    z.object({
      lineNo: z.number(),
      productName: z.string(),
      packLabel: z.string(),
      unitsPerBox: z.number(),
      boxes: z.number(),
      expiryMonth: z.string(),
      batchNumber: z.string().nullable(),
      batchDeclared: z.string().nullable(),
      expiryDeclared: z.string().nullable(),
      shortExpiryAgreed: z.boolean(),
    }),
  ),
  leg1: z
    .object({
      mode: z.enum(LEG1_MODES),
      transporter: z.string().nullable(),
      lrNumber: z.string().nullable(),
      lrDate: z.string().nullable(),
      busDetails: z.string().nullable(),
      driverName: z.string().nullable(),
      driverMobile: z.string().nullable(),
      note: z.string().nullable(),
      freightTerms: z.enum(FREIGHT_TERMS),
      dispatchedOn: z.string(),
      at: z.string(),
    })
    .nullable(),
  daysOnRoad: z.number().nullable(),
  transitOverdue: z.boolean(),
  arrival: z
    .object({ arrivedAt: z.string(), boxesCounted: z.number(), billWithGoods: z.boolean() })
    .nullable(),
  inspectBy: z.string().nullable(),
  inspectionOverdue: z.boolean(),
  result: z
    .object({
      outcome: z.enum(INSPECTION_OUTCOMES),
      acceptedBoxes: z.number(),
      savedAt: z.string(),
      note: z.string().nullable(),
      lines: z.array(
        z.object({
          lineNo: z.number(),
          boxesOnPo: z.number(),
          boxesShort: z.number(),
          boxesDamaged: z.number(),
          boxesLeaking: z.number(),
          boxesAccepted: z.number(),
          boxesExcess: z.number(),
          batchFound: z.string().nullable(),
          expiryFound: z.string().nullable(),
          batchDiffers: z.boolean(),
          expiryDiffers: z.boolean(),
          belowShelfLife: z.boolean(),
        }),
      ),
    })
    .nullable(),
  returnNotes: z.array(
    z.object({ number: z.string(), type: z.enum(RETURN_NOTE_TYPES), boxes: z.number() }),
  ),
});
export type DockRow = z.infer<typeof dockRowSchema>;

export const DOCK_LANES = ['COMING', 'ARRIVED', 'CHECKED'] as const;
export type DockLane = (typeof DOCK_LANES)[number];

export interface DockParams {
  lane: DockLane;
  q: string;
  page: number;
  pageSize: number;
}

export async function listDock(params: DockParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/dock', { params, signal });
  return z
    .object({
      rows: z.array(dockRowSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

const oneRow = z.object({ row: dockRowSchema });

/** The engine action "Goods arrived" for this PO's trade. */
export async function recordArrival(row: DockRow, input: ArrivalInput) {
  const { data } = await apiClient.post<unknown>(`/dock/${row.purchaseOrderId}/arrival`, {
    version: row.tradeVersion,
    ...input,
  });
  return oneRow.parse(data).row;
}

/** The engine action "Check the goods" for this PO's trade. */
export async function inspect(row: DockRow, input: InspectionInput) {
  const { data } = await apiClient.post<unknown>(`/dock/${row.purchaseOrderId}/inspection`, {
    version: row.tradeVersion,
    ...input,
  });
  return oneRow.parse(data).row;
}

const returnNoteSchema = z.object({
  id: z.string(),
  number: z.string(),
  type: z.enum(RETURN_NOTE_TYPES),
  item: z.string(),
  boxes: z.number(),
  reason: z.string(),
  dueAt: z.string(),
  overdue: z.boolean(),
  state: z.enum(['OPEN', 'CLOSED']),
  purchaseOrder: z.object({ id: z.string(), number: z.string() }),
  closure: z
    .object({
      how: z.enum(RETURN_CLOSURES),
      freightPaise: z.number().nullable(),
      note: z.string().nullable(),
      at: z.string(),
    })
    .nullable(),
  createdAt: z.string(),
  version: z.number(),
});
export type ReturnNote = z.infer<typeof returnNoteSchema>;

export interface ReturnNoteParams {
  state: 'OPEN' | 'CLOSED';
  q: string;
  page: number;
  pageSize: number;
}

export async function listReturnNotes(params: ReturnNoteParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/return-notes', { params, signal });
  return z
    .object({
      returnNotes: z.array(returnNoteSchema),
      total: z.number(),
      page: z.number(),
      pageSize: z.number(),
    })
    .parse(data);
}

export interface CloseReturnNoteInput {
  how: ReturnClosure;
  freightPaise?: number | undefined;
  note?: string | undefined;
}

export async function closeReturnNote(note: ReturnNote, input: CloseReturnNoteInput) {
  await apiClient.post<unknown>(`/return-notes/${note.id}/close`, {
    version: note.version,
    ...input,
  });
}
