import type { MenuItem } from '@/types/navigation';

/**
 * The whole sidebar menu in one place. To add an entry: add one line here and its route in router/router.tsx.
 * `icon` must be a name from components/atoms/Icon.tsx.
 */
export const NAV_ITEMS: readonly MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
];
