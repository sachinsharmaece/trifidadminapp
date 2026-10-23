import type { PushStatus } from '../../api/push';
import { Badge, type BadgeTone } from '../ui/Badge';

const LABEL: Record<PushStatus, string> = {
  pending: 'Pending',
  submitted: 'Waiting for approval',
  approved: 'Approved',
  rejected: 'Rejected',
};
const TONE: Record<PushStatus, BadgeTone> = {
  pending: 'warn',
  submitted: 'warn',
  approved: 'good',
  rejected: 'bad',
};

export function PushStatusBadge({ status }: { status: PushStatus }) {
  return <Badge tone={TONE[status]}>{LABEL[status]}</Badge>;
}
