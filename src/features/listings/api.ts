import { z } from 'zod';
import { apiClient } from '@/services/api/client';
import {
  EXPIRY_BANDS,
  LISTING_RATE_TYPES,
  LISTING_STATUSES,
  PROVENANCES,
  type ExpiryBand,
  type ListingStatus,
  type Provenance,
} from '@/types/listing';

/** One seller's offer of one pack. All money is whole paise. */
const listingSchema = z.object({
  id: z.string(),
  seller: z.object({ id: z.string(), number: z.string(), firmName: z.string() }).nullable(),
  sku: z
    .object({
      id: z.string(),
      packLabel: z.string(),
      unitsPerBox: z.number(),
      productName: z.string(),
    })
    .nullable(),
  rateType: z.enum(LISTING_RATE_TYPES),
  /** The landed rate per unit. For an Ex listing the server worked it out: Ex rate + COL split over the box. */
  ratePaisePerUnit: z.number(),
  exRatePaisePerUnit: z.number().nullable(),
  colPaisePerBox: z.number().nullable(),
  boxValuePaise: z.number(),
  expiryBand: z.enum(EXPIRY_BANDS),
  moqBoxes: z.number(),
  quantityBoxes: z.number(),
  provenance: z.enum(PROVENANCES),
  status: z.enum(LISTING_STATUSES),
  expiresAt: z.string(),
  createdAt: z.string(),
});

export type Listing = z.infer<typeof listingSchema>;

const listSchema = z.object({
  listings: z.array(listingSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
});
const oneSchema = z.object({ listing: listingSchema });

/** What the server worked out for an offer that is not saved yet. */
const previewSchema = z.object({
  unitsPerBox: z.number(),
  landedPaisePerUnit: z.number(),
  boxValuePaise: z.number(),
  /** What the minimum order quantity (MOQ) comes to in money: MOQ boxes x box value. */
  lotValuePaise: z.number(),
  /** True when this seller already has the same offer live. */
  duplicate: z.boolean(),
  /** Set when the rate is lower than the allowed drop from this seller's last live rate. */
  decrease: z
    .object({ fromPaisePerUnit: z.number(), toPaisePerUnit: z.number(), pctBp: z.number() })
    .nullable(),
});

export type ListingPreview = z.infer<typeof previewSchema>;

interface OfferBase {
  sellerId: string;
  skuId: string;
  expiryBand: ExpiryBand;
  moqBoxes: number;
  quantityBoxes: number;
  provenance: Provenance;
}

/** What the API needs to describe an offer: a FOR rate, or an Ex rate with COL per box. */
export type ListingInput =
  | (OfferBase & { rateType: 'FOR'; ratePaisePerUnit: number })
  | (OfferBase & { rateType: 'EX'; exRatePaisePerUnit: number; colPaisePerBox: number });

export interface ListingListParams {
  q: string;
  page: number;
  pageSize: number;
  /** Leave out to see every status. */
  status?: ListingStatus | undefined;
}

/** `q` can be a seller number, part of the firm name, or part of the product name. Newest first. */
export async function listListings(params: ListingListParams, signal?: AbortSignal) {
  const { data } = await apiClient.get<unknown>('/listings', { params, signal });
  return listSchema.parse(data);
}

/** Works out the box value, the lot value, duplicates and rate drops. Saves nothing. */
export async function previewListing(input: ListingInput, signal?: AbortSignal) {
  const { data } = await apiClient.post<unknown>('/listings/preview', input, { signal });
  return previewSchema.parse(data);
}

/** Pass `confirmDecrease: true` once the person has agreed to a rate that is lower than the allowed drop. */
export async function createListing(
  input: ListingInput & { confirmDecrease?: boolean },
): Promise<Listing> {
  const { data } = await apiClient.post<unknown>('/listings', input);
  return oneSchema.parse(data).listing;
}

/** A listing is never edited. It can be paused, resumed or withdrawn. To change a rate, withdraw it and add a new one. */
export async function changeListingStatus(
  id: string,
  status: Exclude<ListingStatus, 'EXPIRED'>,
): Promise<Listing> {
  const { data } = await apiClient.patch<unknown>(`/listings/${id}`, { status });
  return oneSchema.parse(data).listing;
}
