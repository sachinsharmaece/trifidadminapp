import { z } from 'zod';
import { tehsilSummarySchema } from '@/features/tehsils/api';
import { apiClient } from '@/services/api/client';
import { TRADE_POSITIONS, type TradePosition } from '@/types/party';

const buyerSchema = z.object({
  id: z.string(),
  number: z.string(),
  firmName: z.string(),
  contactName: z.string(),
  mobiles: z.array(z.string()),
  /** Empty for a consumer (B2C) buyer. */
  gstin: z.string(),
  tehsil: tehsilSummarySchema,
  village: z.string(),
  address: z.string(),
  deliveryLocation: z.string(),
  /** The 2-digit GST state code, worked out by the server. */
  stateCode: z.string(),
  tradePosition: z.enum(TRADE_POSITIONS),
  traderFlag: z.boolean(),
  rateTier: z.enum([...TRADE_POSITIONS, 'TRADER']),
  /** False until the buyer's rate tier is confirmed. Until then the tier is only indicative. */
  classified: z.boolean(),
  manufacturerIds: z.array(z.string()),
  active: z.boolean(),
});

export type Buyer = z.infer<typeof buyerSchema>;

const listSchema = z.object({
  buyers: z.array(buyerSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const oneSchema = z.object({ buyer: buyerSchema });

export interface BuyerListParams {
  q: string;
  page: number;
  pageSize: number;
  /** true = only buyers that are turned on, false = only turned-off ones. Leave out for all. */
  active?: boolean | undefined;
}

export interface BuyerInput {
  firmName: string;
  contactName: string;
  mobiles: string[];
  gstin: string;
  tehsilId: string;
  village: string;
  address: string;
  deliveryLocation: string;
  tradePosition: TradePosition;
  traderFlag: boolean;
  manufacturerIds: string[];
}

export type BuyerChanges = Partial<BuyerInput> & { active?: boolean };

/** `q` can be a buyer number, part of the firm or contact name, the start of a mobile number or GSTIN. */
export async function listBuyers(params: BuyerListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/buyers', { params, signal });
  return listSchema.parse(data);
}

export async function createBuyer(input: BuyerInput): Promise<Buyer> {
  const { data } = await apiClient.post<unknown>('/buyers', input);
  return oneSchema.parse(data).buyer;
}

export async function updateBuyer(id: string, changes: BuyerChanges): Promise<Buyer> {
  const { data } = await apiClient.patch<unknown>(`/buyers/${id}`, changes);
  return oneSchema.parse(data).buyer;
}

/** Confirms the buyer's rate tier. Doing it twice changes nothing. */
export async function classifyBuyer(id: string): Promise<Buyer> {
  const { data } = await apiClient.post<unknown>(`/buyers/${id}/classify`);
  return oneSchema.parse(data).buyer;
}
