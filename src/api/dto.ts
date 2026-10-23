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
  // Phase 1 — the masters this tehsil sits under; null until it is migrated.
  districtId: string | null;
  stateId: string | null;
}

export interface StateDto {
  stateId: string;
  name: string;
  gstStateCode: string;
}

export interface DistrictDto {
  districtId: string;
  name: string;
  stateId: string;
  stateName: string;
}

export interface PincodeLocationDto {
  pincode: string;
  status: 'verified' | 'unverified';
  tehsilId: string;
  tehsilName: string;
  districtId: string | null;
  districtName: string;
  stateId: string | null;
  stateName: string;
}

export interface PincodeListItemDto extends PincodeLocationDto {
  createdByName: string | null;
  verifiedByName: string | null;
  createdAt: string;
}

export interface ManufacturerDto {
  manufacturerId: string;
  name: string;
  // Absent on rows read before either of these existed.
  aka?: string[];
  state?: 'draft' | 'live';
}

export type ProductCategory = 'seed' | 'pesticide' | 'fertilizer';

export interface TechnicalDto {
  technicalId: string;
  name: string;
  state?: 'draft' | 'live';
}

export interface HsnDto {
  hsnId: string;
  code: string;
  description: string;
  taxPercent: number;
}

export interface ProductDto {
  productId: string;
  brand: string;
  hsn: string;
  category?: ProductCategory;
  taxPercent?: number;
  class: 'High' | 'Medium' | 'Low';
  technical?: string;
  manufacturerId?: string;
  manufacturerName?: string;
  active?: boolean;
  state?: 'draft' | 'live';
  createdBy?: string | null;
}

export interface SkuDto {
  skuId: string;
  packLabel: string;
  packSize: number;
  baseUnit: 'LTR' | 'KG' | 'PC';
  unitsPerBox: number;
  baseUnitsPerBox: number;
  active?: boolean;
  state?: 'draft' | 'live';
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
  staffAssisted: boolean;
}

export interface RegistrationStatusDto {
  registrationId: string;
  kind: string;
  status: string;
  firm: string;
  gstin: string;
  rejectionReason?: string;
  staffAssisted: boolean;
  staffAssistedOtpVerifiedAt: string | null;
}

// M4 — BUSINESS_RULES.md §2–§4, §17.

export interface MarginMatrixCellDto {
  marginMatrixId: string;
  class: 'High' | 'Medium' | 'Low';
  tier: 'Distributor' | 'Dealer' | 'Retailer' | 'Trader';
  pct: number;
  creditPct: number;
  effectiveFrom: string;
}

export interface MarginMatrixHistoryRowDto extends MarginMatrixCellDto {
  createdAt: string;
}

export interface CreateSoResult {
  soId: string;
  soNo: string;
}

export interface ChainViewDto {
  chainNo: string;
  stage: 'so' | 'payment' | 'po' | 'leg1' | 'marg' | 'dispatch' | 'done';
  // M9 — each desk receives only its own side (CH §17.3), so every side-specific
  // field is optional here: Purchase gets no buyer/value, Sales no seller, Logistics neither.
  so: {
    soNo: string;
    state: string;
    totalPaise?: number;
    buyerId?: string;
    sellerId?: string;
    payDeadline?: string;
  } | null;
  po: {
    poNo: string;
    state: string;
    sellerId?: string;
    dispatchDueDate: string;
  } | null;
  events: Array<{
    type: string;
    summary?: string;
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
  buyerFirm: string;
  totalPaise: number;
}

export interface PurchaseRegisterRow {
  poId: string;
  poNo: string;
  sellerId: string;
  sellerFirm: string;
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
