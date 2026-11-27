/** Shapes the reference-copy Purchase screens read from our API. */
export interface RefSeller {
  id: string;
  number: string;
  firmName: string;
  gstin: string;
  mobile: string;
  tehsil: { name: string; district: string; state: string } | null;
  dispatchCutoff: string;
  bank: { accountLast4: string; ifsc: string };
  manufacturerIds: string[];
  tier: 'NEW' | 'VERIFIED' | 'TRUSTED';
  /** TriFid Stock, the house seller (Fast order). */
  isHouse?: boolean;
  active: boolean;
  createdAt: string;
}

export interface RefPoRow {
  id: string;
  number: string;
  type: 'TRADE' | 'STOCK';
  approvalStatus: 'PENDING_APPROVAL' | 'ISSUED';
  salesOrderNumber: string | null;
  seller: { number: string; firmName: string };
  payable: { payable: boolean; reasons: string[] } | null;
  createdAt: string;
}

export interface RefProduct {
  id: string;
  name: string;
  manufacturerId: string;
  skus: {
    id: string;
    packLabel: string;
    unitsPerBox: number;
    skuClass: string;
    active?: boolean;
  }[];
}

export const areaText = (t: RefSeller['tehsil']) =>
  t ? `${t.name} — ${t.district}, ${t.state}` : '—';
