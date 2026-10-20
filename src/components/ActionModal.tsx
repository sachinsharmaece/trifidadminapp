import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { ApiError } from '../api/errors';
import { useAuth } from '../auth/AuthContext';
import { useToast } from './ui/Toast';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Textarea } from './ui/Input';

/** A refusal the form should show as-is (not a fault) — e.g. a Marg invoice that did not match. */
export class ActionRefused extends Error {}

export function errorText(error: unknown): string {
  return error instanceof ApiError || error instanceof ActionRefused
    ? error.message
    : 'Something went wrong. Please try again.';
}

/**
 * A modal with the call-note field and submit button that every staff stage action shares
 * (Sales buyer file, Purchase stages). The note is mandatory and is kept with the user's name.
 */
export function ActionModal({
  open,
  title,
  submitLabel,
  danger = false,
  canSubmit = true,
  onClose,
  onSubmit,
  children,
}: {
  open: boolean;
  title: string;
  submitLabel: string;
  danger?: boolean;
  canSubmit?: boolean;
  onClose: () => void;
  onSubmit: (callNote: string) => Promise<void>;
  children?: ReactNode;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setNote('');
      setError(null);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!note.trim()) {
      setError('Add a one-line note on what he said.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(note.trim());
      onClose();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
        {children}
        <Textarea
          label="Call note"
          required
          value={note}
          onChange={(event) => setNote(event.target.value)}
          hint="Kept on the record with your name."
        />
        {error && (
          <p role="alert" className="text-sm text-danger-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Back
          </Button>
          <Button
            type="submit"
            variant={danger ? 'danger' : 'primary'}
            loading={submitting}
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Wires a button to an `ActionModal`; `run` does the call, `done` refetches the page. */
export function useAction(
  run: (token: string, callNote: string) => Promise<string>,
  done: () => void,
) {
  const { callApi } = useAuth();
  const { show } = useToast();
  return useCallback(
    async (callNote: string): Promise<void> => {
      const message = await callApi((token) => run(token, callNote));
      show(message);
      done();
    },
    [callApi, show, run, done],
  );
}
