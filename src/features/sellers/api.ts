import { z } from 'zod';
import { tehsilSummarySchema } from '@/features/tehsils/api';
import { apiClient } from '@/services/api/client';

const sellerSchema = z.object({
  id: z.string(),
  number: z.string(),
  firmName: z.string(),
  gstin: z.string(),
  mobile: z.string(),
  contactName: z.string(),
  tehsil: tehsilSummarySchema,
  address: z.string(),
  dispatchCutoff: z.string(),
  // The server never sends the full account number: only its last 4 digits.
  bank: z.object({
    accountLast4: z.string(),
    ifsc: z.string(),
    bankName: z.string(),
    holderName: z.string(),
  }),
  manufacturerIds: z.array(z.string()),
  active: z.boolean(),
});

export type Seller = z.infer<typeof sellerSchema>;

const listSchema = z.object({
  sellers: z.array(sellerSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const oneSchema = z.object({ seller: sellerSchema });

export interface SellerListParams {
  q: string;
  page: number;
  pageSize: number;
}

export interface SellerInput {
  firmName: string;
  gstin: string;
  mobile: string;
  contactName: string;
  tehsilId: string;
  address: string;
  /** "HH:mm", like "17:30". */
  dispatchCutoff: string;
  manufacturerIds: string[];
  bank: {
    /** Leave out when editing to keep the saved number. */
    accountNumber?: string | undefined;
    ifsc: string;
    bankName: string;
    holderName: string;
  };
}

export type SellerChanges = Partial<SellerInput> & { active?: boolean };

/** `q` can be a seller number, part of the firm or contact name, the start of a mobile number or GSTIN. */
export async function listSellers(params: SellerListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/sellers', { params, signal });
  return listSchema.parse(data);
}

export async function createSeller(input: SellerInput): Promise<Seller> {
  const { data } = await apiClient.post<unknown>('/sellers', input);
  return oneSchema.parse(data).seller;
}

export async function updateSeller(id: string, changes: SellerChanges): Promise<Seller> {
  const { data } = await apiClient.patch<unknown>(`/sellers/${id}`, changes);
  return oneSchema.parse(data).seller;
}
