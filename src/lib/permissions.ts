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
