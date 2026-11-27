import { z } from 'zod';
import { apiClient } from '@/services/api/client';

/** Registers, the trial balance and the dashboard (server: modules/reports). All read only. */

const totalsSchema = z.object({
  count: z.number(),
  taxablePaise: z.number(),
  cgstPaise: z.number(),
  sgstPaise: z.number(),
  igstPaise: z.number(),
  totalPaise: z.number(),
});
export type RegisterTotals = z.infer<typeof totalsSchema>;

const gstParts = {
  taxablePaise: z.number(),
  cgstPaise: z.number(),
  sgstPaise: z.number(),
  igstPaise: z.number(),
  totalPaise: z.number(),
};

const salesRegisterSchema = z.object({
  rows: z.array(
    z.object({
      voucherNumber: z.string(),
      date: z.string(),
      invoiceNumber: z.string(),
      ewayBillNumber: z.string().nullable(),
      orderNumber: z.string().nullable(),
      buyer: z.object({ number: z.string(), firmName: z.string() }),
      gstin: z.string().nullable(),
      ...gstParts,
    }),
  ),
  totals: totalsSchema,
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type SalesRegister = z.infer<typeof salesRegisterSchema>;

const purchaseRegisterSchema = z.object({
  rows: z.array(
    z.object({
      voucherNumber: z.string(),
      date: z.string(),
      poNumber: z.string(),
      seller: z.object({ number: z.string(), firmName: z.string() }),
      gstin: z.string().nullable(),
      /** Entered by Purchase; null until the seller's bill is in. */
      sellerBill: z
        .object({ number: z.string(), billDate: z.string(), amountPaise: z.number() })
        .nullable(),
      ...gstParts,
    }),
  ),
  totals: totalsSchema,
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
export type PurchaseRegister = z.infer<typeof purchaseRegisterSchema>;

const trialBalanceSchema = z.object({
  asOn: z.string().nullable(),
  rows: z.array(
    z.object({
      ledgerId: z.string(),
      name: z.string(),
      group: z.string(),
      debitPaise: z.number(),
      creditPaise: z.number(),
    }),
  ),
  totals: z.object({ debitPaise: z.number(), creditPaise: z.number() }),
  balanced: z.boolean(),
});
export type TrialBalance = z.infer<typeof trialBalanceSchema>;

const dashboardSchema = z.object({
  role: z.string(),
  generatedAt: z.string(),
  funnels: z.array(
    z.object({
      title: z.string(),
      rows: z.array(z.object({ stage: z.string(), label: z.string(), count: z.number() })),
    }),
  ),
  tiles: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.number(),
      kind: z.enum(['count', 'money']),
      tone: z.enum(['normal', 'warn', 'bad']),
      hint: z.string().optional(),
    }),
  ),
  /** Lost deals this month by reason (Controller, Founder, Admin only). */
  leakage: z.array(z.object({ label: z.string(), count: z.number() })).nullable(),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
export type DashboardTile = Dashboard['tiles'][number];

/** The filters of a register: the dates are YYYY-MM-DD, empty = no limit. */
export interface RegisterParams {
  from: string;
  to: string;
  q: string;
  page: number;
  pageSize: number;
}

const clean = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null));

export async function getSalesRegister(params: RegisterParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/reports/sales-register', {
    params: clean(params),
    signal,
  });
  return salesRegisterSchema.parse(data);
}

export async function getPurchaseRegister(params: RegisterParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/reports/purchase-register', {
    params: clean(params),
    signal,
  });
  return purchaseRegisterSchema.parse(data);
}

export async function getTrialBalance(asOn: string, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/reports/trial-balance', {
    params: clean({ asOn }),
    signal,
  });
  return trialBalanceSchema.parse(data);
}

export async function getDashboard(signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/reports/dashboard', { signal });
  return dashboardSchema.parse(data);
}
