/**
 * Copied from trifid-serverapp/src/shared/dto/identity.dto.ts (TD-008,
 * API_CONTRACT.md §11.2). Only the staff-facing type is needed in this
 * repository — trifid-adminapp never handles a counterparty session.
 */
export interface StaffMeDto {
  actorType: 'staff';
  employeeId: string;
  email: string;
  person: string;
  roles: string[];
  permissions: string[];
  mfaEnabled: boolean;
}

export interface EmployeeListItem {
  employeeId: string;
  person: string;
  email: string;
  desk?: string;
  roleKeys: string[];
  active: boolean;
  mfaEnabled: boolean;
}

export interface TehsilDto {
  tehsilId: string;
  name: string;
  district: string;
  state: string;
}

export interface ManufacturerDto {
  manufacturerId: string;
  name: string;
}

export interface ProductDto {
  productId: string;
  brand: string;
  hsn: string;
  class: 'A' | 'B' | 'C';
}

export interface SkuDto {
  skuId: string;
  packLabel: string;
  packSize: number;
  baseUnit: 'LTR' | 'KG' | 'PC';
  unitsPerBox: number;
  baseUnitsPerBox: number;
}

export interface SkuImportRowResult {
  index: number;
  accepted: boolean;
  skuId?: string;
  reason?: string;
}

export interface RegistrationListItem {
  registrationId: string;
  firm?: string;
  gstin?: string;
  kind: 'buyer' | 'seller' | 'both';
  status: 'pending' | 'active' | 'rejected' | 'blacklisted';
  createdAt: string;
}

export interface RegistrationStatusDto {
  registrationId: string;
  kind: string;
  status: string;
  rejectionReason?: string;
}

// M4 — BUSINESS_RULES.md §2–§4, §17.

export interface MarginMatrixCellDto {
  marginMatrixId: string;
  class: 'A' | 'B' | 'C';
  tier: 'Distributor' | 'Dealer' | 'Retailer' | 'Trader';
  pct: number;
  creditPct: number;
  effectiveFrom: string;
}

export interface CreateSoResult {
  soId: string;
  soNo: string;
}

export interface ChainViewDto {
  chainNo: string;
  stage: 'so' | 'payment' | 'po' | 'leg1' | 'marg' | 'dispatch' | 'done';
  so: {
    soNo: string;
    state: string;
    totalPaise: number;
    buyerId: string;
    sellerId: string;
    payDeadline: string;
  } | null;
  po: {
    poNo: string;
    state: string;
    sellerId: string;
    dispatchDueDate: string;
  } | null;
  events: Array<{
    type: string;
    summary: string;
    at: string;
    reason?: string;
  }>;
}

export interface UpcomingReceiptListItem {
  upcomingReceiptId: string;
  buyerId: string;
  amountPaise: number;
  claimedAt: string;
}

export interface SalesRegisterRow {
  soId: string;
  soNo: string;
  buyerId: string;
  totalPaise: number;
}

export interface PurchaseRegisterRow {
  poId: string;
  poNo: string;
  sellerId: string;
  billed: boolean;
}

export interface LaneBoardItem {
  laneKey: string;
  funnel: string;
  label: string;
  holderEmployeeId?: string;
  holderName?: string;
  isCovered: boolean;
  effectiveHolderEmployeeId?: string;
  effectiveHolderName?: string;
}
