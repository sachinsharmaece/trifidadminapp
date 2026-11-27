import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { Journal } from '@/features/journals/api';
import {
  useApproveJournal,
  useCancelJournal,
  useJournals,
  useRejectJournal,
} from '@/features/journals/hooks';
import { JournalForm } from '@/features/journals/JournalForm';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  JOURNAL_KIND_LABELS,
  JOURNAL_KINDS,
  JOURNAL_STATUS_LABELS,
  JOURNAL_STATUS_TONES,
  JOURNAL_STATUSES,
  type JournalKind,
  type JournalStatus,
} from '@/types/books';
import { formatDateTime, formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;

/** "Reject" needs a note: a small inline form under the row. */
function RejectRow({ journal, onClose }: { journal: Journal; onClose: () => void }) {
  const reject = useRejectJournal();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string>();
  return (
    <tr>
      <td colSpan={6} className="bg-slate-50 px-4 py-3">
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!note.trim()) return setError('Say what is wrong');
            setError(undefined);
            reject.mutate({ journal, note: note.trim() }, { onSuccess: onClose });
          }}
        >
          <label className="flex min-w-64 flex-1 flex-col gap-1 text-sm">
            <span>Why is {journal.number} rejected?</span>
            <Input
              aria-label={`Why is ${journal.number} rejected`}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </label>
          <Button type="submit" size="sm" variant="danger" loading={reject.isPending}>
            Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {(error ?? reject.error?.message) && (
            <p role="alert" className="w-full text-sm text-red-700">
              {error ?? reject.error?.message}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}

/** The lines of one entry, shown under its row. */
function LinesRow({ journal }: { journal: Journal }) {
  return (
    <tr>
      <td colSpan={6} className="bg-slate-50 px-4 py-3">
        <table className="w-full max-w-xl text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1 text-left font-medium">Ledger</th>
              <th className="py-1 text-right font-medium">Debit</th>
              <th className="py-1 text-right font-medium">Credit</th>
            </tr>
          </thead>
          <tbody>
            {journal.lines.map((line, index) => (
              <tr key={index}>
                <td className="py-1">{line.ledgerName}</td>
                <td className="py-1 text-right">
                  {line.drPaise > 0 ? formatRupees(line.drPaise) : ''}
                </td>
                <td className="py-1 text-right">
                  {line.crPaise > 0 ? formatRupees(line.crPaise) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

/**
 * Journal entries and opening balances (Build 9). A person types one; a DIFFERENT person approves it, and only then
 * is it in the books. The person who typed it may withdraw it while it waits. A posted one is undone from the
 * Vouchers screen (a reversal), never edited.
 */
export function JournalsPage() {
  const [status, setStatus] = useState<JournalStatus | ''>('PENDING_APPROVAL');
  const [kind, setKind] = useState<JournalKind | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const q = useDebouncedValue(search.trim());
  const journals = useJournals({ status, kind, q, page, pageSize: PAGE_SIZE });
  const approve = useApproveJournal();
  const cancel = useCancelJournal();
  // The Controller only looks (Q-ROL-01); Accounts, Founder and Admin may type and approve.
  const { data: me } = useCurrentUser();
  const canAct = me?.role !== 'CONTROLLER';

  return (
    <PageLayout
      title="Journals and opening balances"
      description="Entries typed by hand. Nothing is in the books until someone other than the person who typed it approves it."
    >
      {canAct && !adding && (
        <div>
          <Button onClick={() => setAdding(true)}>New entry</Button>
        </div>
      )}
      {adding && <JournalForm onDone={() => setAdding(false)} />}

      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Search by number or narration"
        searchLabel="Search journals"
      >
        <Select
          aria-label="Status"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as JournalStatus | '');
            setPage(1);
          }}
        >
          <option value="">Every status</option>
          {JOURNAL_STATUSES.map((value) => (
            <option key={value} value={value}>
              {JOURNAL_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Kind"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as JournalKind | '');
            setPage(1);
          }}
        >
          <option value="">Journals and opening balances</option>
          {JOURNAL_KINDS.map((value) => (
            <option key={value} value={value}>
              {JOURNAL_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
      </DataTableToolbar>

      <ErrorAlert message={approve.error?.message ?? cancel.error?.message} />
      {journals.isPending && <Spinner label="Loading entries" className="h-6 w-6 text-brand-600" />}
      {journals.isError && (
        <ErrorState title="Could not load the entries" message={journals.error.message}>
          <Button onClick={() => void journals.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {journals.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Entry</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Narration</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Typed by</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {journals.data.journals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No entries here.
                    </td>
                  </tr>
                )}
                {journals.data.journals.map((journal) => (
                  <JournalRows
                    key={journal.id}
                    journal={journal}
                    canAct={canAct}
                    isOpen={open === journal.id}
                    onToggle={() => setOpen(open === journal.id ? null : journal.id)}
                    rejecting={rejecting === journal.id}
                    onReject={() => setRejecting(journal.id)}
                    onCloseReject={() => setRejecting(null)}
                    onApprove={() => approve.mutate(journal)}
                    approving={approve.isPending && approve.variables.id === journal.id}
                    onCancel={() => cancel.mutate(journal)}
                    cancelling={cancel.isPending && cancel.variables.id === journal.id}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={journals.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}

function JournalRows(props: {
  journal: Journal;
  canAct: boolean;
  isOpen: boolean;
  onToggle: () => void;
  rejecting: boolean;
  onReject: () => void;
  onCloseReject: () => void;
  onApprove: () => void;
  approving: boolean;
  onCancel: () => void;
  cancelling: boolean;
}) {
  const { journal } = props;
  const pending = journal.status === 'PENDING_APPROVAL';
  return (
    <>
      <tr>
        <td className="whitespace-nowrap px-4 py-3">
          <button
            type="button"
            className="font-medium text-brand-700 hover:underline"
            aria-expanded={props.isOpen}
            onClick={props.onToggle}
          >
            {journal.number}
          </button>
          <div className="text-xs text-slate-500">{JOURNAL_KIND_LABELS[journal.kind]}</div>
        </td>
        <td className="whitespace-nowrap px-4 py-3">{journal.date}</td>
        <td className="px-4 py-3">{journal.narration}</td>
        <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
          {formatRupees(journal.totalPaise)}
        </td>
        <td className="px-4 py-3">
          {journal.createdBy}
          <div className="text-xs text-slate-500">{formatDateTime(journal.createdAt)}</div>
        </td>
        <td className="px-4 py-3">
          {pending && props.canAct ? (
            journal.typedByMe ? (
              <div className="flex flex-col items-start gap-1">
                <span className="text-xs text-slate-500">You typed it: someone else approves</span>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={props.cancelling}
                  onClick={props.onCancel}
                >
                  Cancel entry
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" loading={props.approving} onClick={props.onApprove}>
                  Approve
                </Button>
                <Button size="sm" variant="secondary" onClick={props.onReject}>
                  Reject
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col gap-1">
              <Badge tone={JOURNAL_STATUS_TONES[journal.status]}>
                {JOURNAL_STATUS_LABELS[journal.status]}
              </Badge>
              <span className="text-xs text-slate-500">
                {journal.status === 'REJECTED' && (journal.rejectNote ?? '')}
                {journal.status === 'POSTED' && (journal.voucherNumber ?? '')}
                {journal.status === 'REVERSED' &&
                  `${journal.voucherNumber ?? ''} → ${journal.reverseVoucherNumber ?? ''}`}
              </span>
            </div>
          )}
        </td>
      </tr>
      {props.isOpen && <LinesRow journal={journal} />}
      {props.rejecting && <RejectRow journal={journal} onClose={props.onCloseReject} />}
    </>
  );
}
