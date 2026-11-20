import { Badge } from './Badge';

/** "Active" (green) or "Turned off" (grey). Master records are turned off, never deleted. */
export function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'success' : 'neutral'}>{active ? 'Active' : 'Turned off'}</Badge>;
}
