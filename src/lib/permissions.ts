// Copied from trifid-serverapp/src/config/permissions.ts (TD-007) — only the
// keys this app's screens actually check against.
export const PERMISSIONS = {
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_WRITE: 'employee:write',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
  CATALOG_WRITE: 'catalog:write',
  TERRITORY_READ: 'territory:read',
  TERRITORY_WRITE: 'territory:write',
  ONBOARDING_READ: 'onboarding:read',
  ONBOARDING_APPROVE: 'onboarding:approve',
  // M4 additions.
  MARGIN_MATRIX_READ: 'margin_matrix:read',
  MARGIN_MATRIX_WRITE: 'margin_matrix:write',
  CHAIN_READ: 'chain:read',
  SO_CREATE: 'so:create',
  SO_REDUCE_QUANTITY: 'so:reduce_quantity',
  PO_CREATE: 'po:create',
  PO_EDIT: 'po:edit',
  RECEIPT_READ: 'receipt:read',
  RECEIPT_ALLOCATE: 'receipt:allocate',
  BANK_POST: 'bank:post',
  BANK_REPOST: 'bank:repost',
  PAYOUT_BUILD: 'payout:build',
  PAYOUT_RELEASE: 'payout:release',
  PAYOUT_READ: 'payout:read',
  MARG_KEY: 'marg:key',
  DAY_CLOSE_RUN: 'day_close:run',
  DOCK_INSPECT: 'dock:inspect',
  MOVEMENT_WRITE: 'movement:write',
  REGISTER_READ: 'register:read',
} as const;

// Copied from trifid-serverapp/src/config/permissions.ts (BR-260). There is
// no GET /admin/roles endpoint — the seven roles are fixed by the Charter,
// not admin-editable, so listing them here is the same kind of copy as the
// DTOs above rather than a config the server should have to serve.
export const ROLE_KEYS = [
  'purchase',
  'sales',
  'transport_logistics',
  'accounts',
  'controller',
  'admin',
  'founder',
] as const;
