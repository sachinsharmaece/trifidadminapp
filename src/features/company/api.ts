import { z } from 'zod';
import { apiClient } from '@/services/api/client';

const companySchema = z.object({
  id: z.string(),
  name: z.string(),
  gstin: z.string(),
  /** First two digits of the GSTIN (decides CGST+SGST or IGST later). */
  stateCode: z.string(),
  address: z.string(),
  bank: z.object({
    /** The server never sends the full account number: only its last 4 digits (null if none is saved). */
    accountLast4: z.string().nullable(),
    ifsc: z.string(),
    bankName: z.string(),
  }),
  updatedAt: z.string().nullable(),
});

export type Company = z.infer<typeof companySchema>;

const responseSchema = z.object({ company: companySchema.nullable() });

/** The company profile, or null before it has been set up. */
export async function getCompany(signal?: AbortSignal): Promise<Company | null> {
  const { data } = await apiClient.get<unknown>('/company', { signal });
  return responseSchema.parse(data).company;
}

export interface SaveCompanyInput {
  name: string;
  gstin: string;
  address: string;
  /** An empty accountNumber keeps the saved one. */
  bank: { accountNumber: string; ifsc: string; bankName: string };
}

/** Creates the company profile the first time, and changes it after that. */
export async function saveCompany(input: SaveCompanyInput): Promise<Company> {
  const { data } = await apiClient.put<unknown>('/company', input);
  const { company } = responseSchema.parse(data);
  if (!company) throw new Error('The server did not return the company.');
  return company;
}
