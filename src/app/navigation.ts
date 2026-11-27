import type { MenuItem } from '@/types/navigation';

/**
 * The whole sidebar menu in one place. To add an entry: add one line here and its route in router/router.tsx.
 * `icon` must be a name from components/atoms/Icon.tsx.
 */
export const NAV_ITEMS: readonly MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  // Parties: each team sees only its own side. The API enforces the same wall (modules/parties/permissions.ts).
  {
    label: 'Buyers',
    path: '/buyers',
    icon: 'cart',
    roles: ['SALES', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The rate board is the Sales desk's price list for one buyer. The API enforces the same wall as the buyers.
  {
    label: 'Rate board',
    path: '/rate-board',
    icon: 'rupee',
    roles: ['SALES', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Trades (deal cards), buyer side. Opened from the Rate board.
  {
    label: 'Buyer funnels',
    path: '/buyer-funnels',
    icon: 'funnel',
    roles: ['SALES', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Orders raised when a buyer says yes. Accounts reads them too.
  {
    label: 'Sales orders',
    path: '/sales-orders',
    icon: 'receipt',
    roles: ['SALES', 'ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The Controller's morning list: what ran past its time, goods that never came, payouts on hold.
  {
    label: 'Today',
    path: '/today',
    icon: 'clipboard',
    roles: ['CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Buyers who say something is wrong after dispatch: Sales raises it on the deal card, the Controller decides.
  {
    label: 'Complaints',
    path: '/complaints',
    icon: 'alert',
    roles: ['SALES', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The Accounts desk queue: confirm payments Sales entered (the same engine buttons as the deal card).
  {
    label: 'Payments to confirm',
    path: '/payments',
    icon: 'check',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Raised when a buyer has paid in full. Seller side: never Sales.
  {
    label: 'Purchase orders',
    path: '/purchase-orders',
    icon: 'clipboard',
    roles: ['PURCHASE', 'ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The Indore dock: arrival and the check. No firm names or money.
  {
    label: 'Dock',
    path: '/dock',
    icon: 'truck',
    roles: ['LOGISTICS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Billed orders loaded onto trips, checked out, and the proof of dispatch. No firm names or money.
  {
    label: 'Trips',
    path: '/trips',
    icon: 'truck',
    roles: ['LOGISTICS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Boxes going back to sellers after the dock check.
  {
    label: 'Return notes',
    path: '/return-notes',
    icon: 'return',
    roles: ['PURCHASE', 'LOGISTICS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The Accounts desk queue: checked lots waiting for their Marg bill (the same engine button as the deal card).
  {
    label: 'To be billed',
    path: '/to-be-billed',
    icon: 'receipt',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Seller payments and buyer refunds: built by Accounts, released by the Founder or Admin, paid when the UTR is typed.
  {
    label: 'Payouts',
    path: '/payouts',
    icon: 'rupee',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The books.
  {
    label: 'Ledgers',
    path: '/ledgers',
    icon: 'book',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  {
    label: 'Bank accounts',
    path: '/bank-accounts',
    icon: 'bank',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  {
    label: 'Sellers',
    path: '/sellers',
    icon: 'store',
    roles: ['PURCHASE', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Listings are the Purchase team's work (sellers' offers). The API enforces the same wall.
  {
    label: 'Listings',
    path: '/listings',
    icon: 'trending-up',
    roles: ['PURCHASE', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // Trades on the seller side: Purchase's queue (find a seller, get his confirmation).
  {
    label: 'Seller funnels',
    path: '/seller-funnels',
    icon: 'funnel',
    roles: ['PURCHASE', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The registers: read from the vouchers, one CSV away from the tax filing. Two screens, so no row shows a buyer
  // and a seller together. The API enforces the same roles (modules/reports/reports.routes.ts).
  {
    label: 'Sales register',
    path: '/reports/sales-register',
    icon: 'book',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  {
    label: 'Purchase register',
    path: '/reports/purchase-register',
    icon: 'book',
    roles: ['PURCHASE', 'ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  {
    label: 'Trial balance',
    path: '/reports/trial-balance',
    icon: 'percent',
    roles: ['ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The nightly check that the records agree with each other.
  {
    label: 'Integrity check',
    path: '/integrity',
    icon: 'check',
    roles: ['CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  // The masters: everyone can look, only Founder and Admin see the add / edit buttons.
  { label: 'Products', path: '/products', icon: 'box' },
  { label: 'Manufacturers', path: '/manufacturers', icon: 'briefcase' },
  { label: 'Technicals', path: '/technicals', icon: 'droplet' },
  { label: 'HSN codes', path: '/hsn-codes', icon: 'tag' },
  { label: 'Tehsils', path: '/tehsils', icon: 'map-pin' },
  { label: 'Reason codes', path: '/reason-codes', icon: 'list' },
  // TriFid's own margin: Controller, Founder and Admin only. The API enforces the same wall.
  {
    label: 'Margin matrix',
    path: '/margin-matrix',
    icon: 'percent',
    roles: ['CONTROLLER', 'FOUNDER', 'ADMIN'],
  },
  { label: 'Company', path: '/company', icon: 'building' },
  { label: 'Staff', path: '/staff', icon: 'users', roles: ['FOUNDER', 'ADMIN'] },
];
