import type { IconName } from '@/components/atoms/Icon';

/** What a navigation menu needs to draw one link. */
export interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
}
