import { useState } from 'react';
import type { FormEvent } from 'react';
import { FiUsers } from 'react-icons/fi';
import { changeOwner } from '../../api/leads';
import { useAuth } from '../../auth/AuthContext';
import { useFormSubmit } from '../../lib/useFormSubmit';
import { AssigneeSelect } from '../buyer/BuyerFields';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';

/**
 * Phase 5 — Change owner on a buyer or seller file. The server decides who
 * may (his leader, within the team, or Admin) and says so as
 * `canChangeOwner`; the picker lists only the people the caller may hand
 * him to. Leaving it on "Queue" puts him back in the Queue.
 */
export function ChangeOwnerButton({
  side,
  profileId,
  firm,
  current,
  onChanged,
}: {
  side: 'buyer' | 'seller';
  profileId: string;
  firm: string;
  current: { employeeId: string; person: string } | null;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" icon={<FiUsers />} onClick={() => setOpen(true)}>
        Change owner
      </Button>
      {open && (
        <ChangeOwnerModal
          side={side}
          profileId={profileId}
          firm={firm}
          current={current}
          onClose={() => setOpen(false)}
          onChanged={() => {
            setOpen(false);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function ChangeOwnerModal({
  side,
  profileId,
  firm,
  current,
  onClose,
  onChanged,
}: {
  side: 'buyer' | 'seller';
  profileId: string;
  firm: string;
  current: { employeeId: string; person: string } | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { callApi } = useAuth();
  const [ownerEmployeeId, setOwnerEmployeeId] = useState(current?.employeeId ?? '');
  const [note, setNote] = useState('');
  const save = useFormSubmit<{ owner: string | null }>({
    fields: ['ownerEmployeeId', 'note'],
    success: (result) =>
      result.owner ? `${firm} now belongs to ${result.owner}.` : `${firm} is back in the Queue.`,
    onSuccess: onChanged,
    toastOnSuccess: true,
  });
  const unchanged = ownerEmployeeId === (current?.employeeId ?? '');

  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    void save.submit((key) =>
      callApi((token) =>
        changeOwner(
          token,
          side,
          profileId,
          { ownerEmployeeId: ownerEmployeeId || null, note: note.trim() || undefined },
          key,
        ),
      ),
    );
  }

  return (
    <Modal open title={`Change owner — ${firm}`} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AssigneeSelect
          side={side === 'buyer' ? 'sales' : 'purchase'}
          allowQueue
          value={ownerEmployeeId}
          onChange={setOwnerEmployeeId}
          current={current}
          error={save.fieldErrors.ownerEmployeeId}
        />
        <Input
          label="Note (optional)"
          value={note}
          onChange={(ev) => setNote(ev.target.value)}
          error={save.fieldErrors.note}
          hint="Why he is moving — kept in the audit log."
        />
        {save.formError && (
          <p role="alert" className="text-sm text-danger-500">
            {save.formError}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="submit" loading={save.submitting} disabled={unchanged}>
            Change owner
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
