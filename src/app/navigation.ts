import type { Role } from '@/types/roles';

/**
 * The sidebar, exactly as the reference admin (components/layout/RoleNav.tsx): one collapsible section per desk.
 * Admin, Controller and Founder see every section; everyone else sees only their own desk.
 * To add an entry: add one line here and its route in router/router.tsx.
 */
export interface NavLink {
  label: string;
  path: string;
}
export interface NavSection {
  section: string;
  links: NavLink[];
}

const CONTROLLER_SECTION: NavSection = {
  section: 'Controller',
  links: [{ label: 'Today', path: '/controller-today' }],
};

const MASTERS_SECTION: NavSection = {
  section: 'Masters',
  links: [
    { label: 'Company', path: '/masters/company' },
    { label: 'Products & SKUs', path: '/masters/products' },
    { label: 'Margin matrix', path: '/masters/margin-matrix' },
    { label: 'SKU price matrix', path: '/masters/sku-margins' },
    { label: 'Tehsils', path: '/masters/tehsils' },
    { label: 'Manufacturers', path: '/masters/manufacturers' },
    { label: 'Technicals', path: '/masters/technicals' },
    { label: 'HSN codes', path: '/masters/hsn' },
    { label: 'Reason codes', path: '/masters/reason-codes' },
    { label: 'Bank accounts', path: '/masters/bank-accounts' },
    { label: 'Staff', path: '/masters/staff' },
    { label: 'Settings', path: '/settings' },
  ],
};

const PURCHASE_DESK_SECTION: NavSection = {
  section: 'Purchase desk',
  links: [
    { label: 'Today', path: '/purchase-today' },
    { label: 'Sellers', path: '/sellers' },
    { label: 'New listing', path: '/listings/new' },
    { label: 'Confirmations', path: '/confirmations' },
    { label: 'Purchase orders', path: '/purchase-orders' },
    { label: 'Seller funnels', path: '/seller-funnels' },
    { label: 'Seller leads', path: '/seller-leads' },
  ],
};

const SALES_DESK_SECTION: NavSection = {
  section: 'Sales desk',
  links: [
    { label: 'Today', path: '/today' },
    { label: 'Buyers', path: '/buyers' },
    { label: 'Call screen', path: '/call-screen' },
    { label: 'Asks', path: '/asks' },
    { label: 'Sales orders', path: '/sales-orders' },
    { label: 'Buyer funnels', path: '/buyer-funnels' },
  ],
};

const LOGISTICS_DESK_SECTION: NavSection = {
  section: 'Logistics desk',
  links: [
    { label: 'Dock (new)', path: '/dock' },
    { label: 'Goods-in', path: '/goods-in' },
    { label: 'Inspection', path: '/inspection' },
    { label: 'Dispatch (leg 2)', path: '/dispatch-leg2' },
    { label: 'Trade queue', path: '/logistics-trade-queue' },
  ],
};

const ACCOUNTS_DESK_SECTION: NavSection = {
  section: 'Accounts desk',
  links: [
    { label: 'Today', path: '/accounts-today' },
    { label: 'Upcoming payments', path: '/upcoming-payments' },
    { label: 'To be billed', path: '/to-be-billed' },
    { label: 'Ledger', path: '/ledger' },
    { label: 'Payment', path: '/payment' },
    { label: 'Journal entry', path: '/journal' },
    { label: 'Ledger master', path: '/ledger-master' },
    { label: 'Credit log', path: '/credit-log' },
  ],
};

const SINGLE_SECTION_BY_ROLE: Partial<Record<Role, NavSection>> = {
  PURCHASE: PURCHASE_DESK_SECTION,
  SALES: SALES_DESK_SECTION,
  ACCOUNTS: ACCOUNTS_DESK_SECTION,
};

const SUPERVISORY_ROLES: readonly Role[] = ['ADMIN', 'CONTROLLER', 'FOUNDER'];

/** The sections one person sees. "Vehicle owners" is for a Logistics Head (and the supervisory roles) only. */
export function navSectionsFor(role: Role, position: string | null): NavSection[] {
  const logistics: NavSection =
    role !== 'LOGISTICS' || position === 'LOGISTICS_HEAD'
      ? {
          ...LOGISTICS_DESK_SECTION,
          links: [
            ...LOGISTICS_DESK_SECTION.links,
            { label: 'Vehicle owners', path: '/vehicle-owners' },
          ],
        }
      : LOGISTICS_DESK_SECTION;
  if (SUPERVISORY_ROLES.includes(role)) {
    return [
      CONTROLLER_SECTION,
      MASTERS_SECTION,
      PURCHASE_DESK_SECTION,
      SALES_DESK_SECTION,
      logistics,
      ACCOUNTS_DESK_SECTION,
    ];
  }
  if (role === 'LOGISTICS') return [logistics];
  return [SINGLE_SECTION_BY_ROLE[role] ?? { section: role, links: [] }];
}
