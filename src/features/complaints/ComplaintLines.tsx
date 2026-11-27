import { Badge } from '@/components/atoms/Badge';
import {
  COMPLAINT_CATEGORY_LABELS,
  COMPLAINT_OUTCOME_SHORT,
  type ComplaintOutcome,
} from '@/types/complaint';
import { dueText, formatDateTime, formatRupees } from '@/utils/format';
import type { Complaint } from './api';

/** What the decision gave, in a few words: "₹5,000.00 credit note JV-26-0001", "3 boxes refunded", … */
function givenText(resolution: NonNullable<Complaint['resolution']>): string {
  const boxes = resolution.boxes ?? 0;
  const byOutcome: Record<ComplaintOutcome, string> = {
    NO_ACTION: 'Complaint not accepted',
    CREDIT: `${formatRupees(resolution.amountPaise ?? 0)} credited${
      resolution.creditNoteNumber ? ` (${resolution.creditNoteNumber})` : ''
    }`,
    REPLACEMENT: `${boxes} boxes to be replaced`,
    RETURN: `${boxes} boxes to come back`,
    REFUND: `${boxes} boxes refunded: ${formatRupees(resolution.amountPaise ?? 0)}${
      resolution.refundNumber
        ? ` (${resolution.refundNumber}, ${resolution.refundStatus === 'PAID' ? 'paid' : 'due'})`
        : ''
    }`,
  };
  return byOutcome[resolution.outcome];
}

/** The complaints on a trade or an order, oldest first: what was said, and what the Controller decided. */
export function ComplaintLines({ complaints }: { complaints: Complaint[] }) {
  return (
    <ul className="divide-y divide-slate-100 text-sm" aria-label="Complaints">
      {complaints.map((item) => (
        <li key={item.id} className="space-y-1 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{item.number}</span>
            <span>
              {COMPLAINT_CATEGORY_LABELS[item.category]} · {item.reasonLabel}
              {item.boxes ? ` · ${item.boxes} boxes` : ''}
            </span>
            {item.status === 'RESOLVED' && item.resolution ? (
              <Badge tone={item.resolution.outcome === 'NO_ACTION' ? 'neutral' : 'success'}>
                {COMPLAINT_OUTCOME_SHORT[item.resolution.outcome]}
              </Badge>
            ) : (
              <Badge tone={item.overdue ? 'danger' : 'warning'}>
                Open: Controller decides {dueText(item.resolveByAt)}
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-500">
            Raised {formatDateTime(item.raisedAt)} by {item.raisedBy}
            {item.description ? `: ${item.description}` : ''}
          </div>
          {item.resolution && (
            <div className="text-xs text-slate-700">
              {givenText(item.resolution)}. {item.resolution.note} ({item.resolution.by},{' '}
              {formatDateTime(item.resolution.at)})
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
