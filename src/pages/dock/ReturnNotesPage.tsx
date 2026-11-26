import { useState } from 'react';
import { Link } from 'react-router';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Input } from '@/components/atoms/Input';
import { Select } from '@/components/atoms/Select';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { DataTableToolbar } from '@/components/organisms/DataTableToolbar';
import { PageLayout } from '@/components/templates/PageLayout';
import { useCurrentUser } from '@/features/auth/hooks';
import type { ReturnNote } from '@/features/dock/api';
import { useCloseReturnNote, useReturnNotes } from '@/features/dock/hooks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { rupeesToPaise } from '@/schemas/fields';
import {
  RETURN_CLOSURES,
  RETURN_CLOSURE_LABELS,
  RETURN_NOTE_TYPE_LABELS,
  type ReturnClosure,
} from '@/types/dock';
import { boxesText, formatDate, formatDateTime, formatRupees } from '@/utils/format';

const PAGE_SIZE = 25;
/** Who may open the PO behind a note (Logistics works from the dock, without firm names or money). */
const READS_POS = ['PURCHASE', 'ACCOUNTS', 'CONTROLLER', 'FOUNDER', 'ADMIN'];

/** "Close": how the boxes went back, what the return freight cost (if any) and a note. */
function CloseRow({ note, onClose }: { note: ReturnNote; onClose: () => void }) {
  const close = useCloseReturnNote();
  const [how, setHow] = useState<ReturnClosure>('PICKED_UP');
  const [freight, setFreight] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();

  function submit() {
    let freightPaise: number | undefined;
    if (freight.trim()) {
      const parsed = rupeesToPaise('Enter the freight', 1_000_000).safeParse(freight);
      if (!parsed.success) return setError('Use an amount like 450 or 449.50');
      freightPaise = parsed.data;
    }
    setError(undefined);
    close.mutate(
      { note, close: { how, freightPaise, note: text.trim() || undefined } },
      { onSuccess: onClose },
    );
  }

  return (
    <tr>
      <td colSpan={6} className="bg-slate-50 px-4 py-3">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span>How did {note.number} go back?</span>
            <Select value={how} onChange={(event) => setHow(event.target.value as ReturnClosure)}>
              {RETURN_CLOSURES.map((value) => (
                <option key={value} value={value}>
                  {RETURN_CLOSURE_LABELS[value]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex w-36 flex-col gap-1 text-sm">
            <span>Return freight (₹)</span>
            <Input
              inputMode="decimal"
              value={freight}
              onChange={(event) => setFreight(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
            <span>Note</span>
            <Input value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          <Button type="submit" size="sm" loading={close.isPending}>
            Close the note
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          {(error ?? close.error?.message) && (
            <p role="alert" className="w-full text-sm text-red-700">
              {error ?? close.error?.message}
            </p>
          )}
        </form>
      </td>
    </tr>
  );
}

/**
 * Return notes (LOCK-40 L40.7): damaged, leaking or extra boxes going back to the seller, due within 30 days.
 * Never written off: each is closed as picked up, shipped back or disposed of. Purchase and Logistics close them;
 * the Controller looks. The return freight is recorded here; debiting it to the seller comes with payouts.
 */
export function ReturnNotesPage() {
  const [state, setState] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [closing, setClosing] = useState<string | null>(null);
  const q = useDebouncedValue(search.trim());
  const notes = useReturnNotes({ state, q, page, pageSize: PAGE_SIZE });
  const { data: me } = useCurrentUser();
  const canClose = me?.role !== 'CONTROLLER';
  const readsPos = me ? READS_POS.includes(me.role) : false;

  return (
    <PageLayout
      title="Return notes"
      description="Boxes going back to sellers after the dock check. Close each one when the boxes have gone."
    >
      <DataTableToolbar
        searchValue={search}
        onSearchChange={(text) => {
          setSearch(text);
          setPage(1);
        }}
        searchPlaceholder="Search by note or PO number"
        searchLabel="Search return notes"
      >
        <Select
          aria-label="Show"
          value={state}
          onChange={(event) => {
            setState(event.target.value as 'OPEN' | 'CLOSED');
            setPage(1);
          }}
        >
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </Select>
      </DataTableToolbar>
      {notes.isPending && (
        <Spinner label="Loading return notes" className="h-6 w-6 text-brand-600" />
      )}
      {notes.isError && (
        <ErrorState title="Could not load the return notes" message={notes.error.message}>
          <Button onClick={() => void notes.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {notes.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Note</th>
                  <th className="px-4 py-3 font-medium">What goes back</th>
                  <th className="px-4 py-3 font-medium">PO</th>
                  <th className="px-4 py-3 font-medium">{state === 'OPEN' ? 'Due' : 'Closed'}</th>
                  <th className="px-4 py-3 font-medium">Why</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {notes.data.returnNotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      No return notes here.
                    </td>
                  </tr>
                )}
                {notes.data.returnNotes.flatMap((note) => [
                  <tr key={note.id}>
                    <td className="px-4 py-3 font-medium">
                      {note.number}
                      <div className="text-xs font-normal text-slate-500">
                        {RETURN_NOTE_TYPE_LABELS[note.type]}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {boxesText(note.boxes)} · {note.item}
                    </td>
                    <td className="px-4 py-3">
                      {readsPos ? (
                        <Link
                          to={`/purchase-orders/${note.purchaseOrder.id}`}
                          className="text-brand-700 hover:underline"
                        >
                          {note.purchaseOrder.number}
                        </Link>
                      ) : (
                        note.purchaseOrder.number
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {note.closure ? (
                        <>
                          {formatDateTime(note.closure.at)}
                          <div className="text-xs text-slate-500">
                            {RETURN_CLOSURE_LABELS[note.closure.how]}
                            {note.closure.freightPaise
                              ? ` · freight ${formatRupees(note.closure.freightPaise)}`
                              : ''}
                            {note.closure.note ? ` · ${note.closure.note}` : ''}
                          </div>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          {formatDate(note.dueAt)}
                          {note.overdue && <Badge tone="danger">Overdue</Badge>}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{note.reason}</td>
                    <td className="px-4 py-3 text-right">
                      {note.state === 'OPEN' && canClose && closing !== note.id && (
                        <Button size="sm" variant="secondary" onClick={() => setClosing(note.id)}>
                          Close
                        </Button>
                      )}
                    </td>
                  </tr>,
                  ...(closing === note.id
                    ? [
                        <CloseRow
                          key={`${note.id}-close`}
                          note={note}
                          onClose={() => setClosing(null)}
                        />,
                      ]
                    : []),
                ])}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={notes.data.total}
            onPageChange={setPage}
          />
        </>
      )}
    </PageLayout>
  );
}
