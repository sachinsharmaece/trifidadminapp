import { useCallback, useRef, useState } from 'react';
import { ApiError } from '../api/errors';
import { newIdempotencyKey } from './idempotency';
import { useOptionalToast } from '../components/ui/Toast';

/**
 * The one way a staff form saves (Phase 0 form kit). It owns:
 *
 * - **The Idempotency-Key.** One key per attempt. A double click while a save
 *   is in flight is ignored. After a network failure — the server may or may
 *   not have acted — the next attempt reuses the same key, so a retry can
 *   never act twice. After any answer from the server the key is spent: the
 *   server stores that answer under it (middleware/idempotency.ts) and would
 *   refuse the same key with an edited body.
 * - **Errors next to the field.** Server field errors are keyed by field
 *   path. Any that the form has no field for (pass `fields`) — or a
 *   field-less error — become `formError`, so nothing is silently dropped.
 * - **Duplicates.** A duplicate refusal names the clashing field and the
 *   existing record (`meta.existingCounterpartyId`).
 * - **Success.** `successMessage` is set and `onSuccess` runs; the form
 *   resets its own fields there. A form that closes or disappears on
 *   success (a modal, a decision panel) passes `toastOnSuccess`, so the
 *   message is still seen.
 */
export interface DuplicateHit {
  field: string;
  existingId: string;
}

export interface FormSubmitOptions<T> {
  /** The form's own field paths; a server error for any other path is shown as `formError`. */
  fields?: readonly string[];
  /** Shown after a save, e.g. "Buyer registered." */
  success?: string | ((result: T) => string);
  onSuccess?: (result: T) => void;
  /** Shown for an error that is not an ApiError. */
  fallbackError?: string;
  /** Also show the success message as a toast — for a form that closes on success. */
  toastOnSuccess?: boolean;
}

export function useFormSubmit<T>(options: FormSubmitOptions<T> = {}) {
  const keyRef = useRef<string | null>(null);
  const inFlight = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateHit | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const toast = useOptionalToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setFieldErrors({});
    setFormError(null);
    setDuplicate(null);
    setSuccessMessage(null);
  }, []);

  const submit = useCallback(
    async (action: (idempotencyKey: string) => Promise<T>): Promise<T | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      const { fields, success, onSuccess, fallbackError, toastOnSuccess } = optionsRef.current;
      clearMessages();
      setSubmitting(true);
      const key = keyRef.current ?? newIdempotencyKey();
      keyRef.current = key;
      try {
        const result = await action(key);
        keyRef.current = null;
        const message = typeof success === 'function' ? success(result) : (success ?? 'Saved.');
        setSuccessMessage(message);
        if (toastOnSuccess) toastRef.current?.show(message);
        onSuccess?.(result);
        return result;
      } catch (caught) {
        if (!(caught instanceof ApiError)) {
          keyRef.current = null;
          setFormError(fallbackError ?? 'Could not save. Please try again.');
          return undefined;
        }
        if (caught.code !== 'NETWORK_ERROR') keyRef.current = null;
        const placed = splitFieldErrors(caught, fields);
        setFieldErrors(placed.fieldErrors);
        setFormError(placed.formError);
        const existingId = caught.meta?.existingCounterpartyId;
        if (typeof existingId === 'string' && caught.field) {
          setDuplicate({ field: caught.field, existingId });
        }
        return undefined;
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [clearMessages],
  );

  return {
    submit,
    submitting,
    fieldErrors,
    formError,
    duplicate,
    successMessage,
    clearFieldError,
    clearMessages,
  };
}

/** Exported for tests. */
export function splitFieldErrors(
  error: ApiError,
  fields: readonly string[] | undefined,
): { fieldErrors: Record<string, string>; formError: string | null } {
  const all: Record<string, string> =
    error.fieldErrors ?? (error.field ? { [error.field]: error.message } : {});
  const fieldErrors: Record<string, string> = {};
  const unplaced: string[] = [];
  for (const [field, message] of Object.entries(all)) {
    if (field && (!fields || fields.includes(field))) fieldErrors[field] = message;
    else unplaced.push(message);
  }
  if (Object.keys(fieldErrors).length === 0) return { fieldErrors, formError: error.message };
  return { fieldErrors, formError: unplaced.length > 0 ? unplaced.join(' ') : null };
}
