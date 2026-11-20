import type { IconName } from '@/components/atoms/Icon';
import type { Role } from '@/types/roles';

/** What a navigation menu needs to draw one link. */
export interface MenuItem {
  label: string;
  path: string;
  icon: IconName;
  /** Only these roles see the link. Leave it out to show the link to everyone. (The API enforces access too.) */
  roles?: readonly Role[];
}
