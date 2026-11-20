import type { MenuItem } from '@/types/navigation';

/**
 * The whole sidebar menu in one place. To add an entry: add one line here and its route in router/router.tsx.
 * `icon` must be a name from components/atoms/Icon.tsx.
 */
export const NAV_ITEMS: readonly MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  // The masters: everyone can look, only Founder and Admin see the add / edit buttons.
  { label: 'Products', path: '/products', icon: 'box' },
  { label: 'Manufacturers', path: '/manufacturers', icon: 'briefcase' },
  { label: 'Technicals', path: '/technicals', icon: 'droplet' },
  { label: 'HSN codes', path: '/hsn-codes', icon: 'tag' },
  { label: 'Staff', path: '/staff', icon: 'users', roles: ['FOUNDER', 'ADMIN'] },
];
