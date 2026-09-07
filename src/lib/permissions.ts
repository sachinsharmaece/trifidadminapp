// Copied from trifid-serverapp/src/config/permissions.ts (TD-007) — only the
// keys this app's screens actually check against.
export const PERMISSIONS = {
  EMPLOYEE_READ: 'employee:read',
  EMPLOYEE_WRITE: 'employee:write',
  CONFIG_READ: 'config:read',
  CONFIG_WRITE: 'config:write',
} as const;
