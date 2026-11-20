/** Staff roles. A copy of ROLES in trifidserverapp/src/shared/enums.ts: change both together. */
export const ROLES = [
  'FOUNDER',
  'ADMIN',
  'CONTROLLER',
  'SALES',
  'PURCHASE',
  'ACCOUNTS',
  'LOGISTICS',
] as const;

export type Role = (typeof ROLES)[number];

/** How a role is written on screen. */
export const ROLE_LABELS: Record<Role, string> = {
  FOUNDER: 'Founder',
  ADMIN: 'Admin',
  CONTROLLER: 'Controller',
  SALES: 'Sales',
  PURCHASE: 'Purchase',
  ACCOUNTS: 'Accounts',
  LOGISTICS: 'Logistics',
};
