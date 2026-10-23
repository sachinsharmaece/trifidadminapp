import type { ReactNode } from 'react';
import { act, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../src/api/errors';
import { formatDate, formatDateTime } from '../src/lib/dates';
import { splitFieldErrors, useFormSubmit } from '../src/lib/useFormSubmit';
import { ToastProvider } from '../src/components/ui/Toast';

describe('formatDate / formatDateTime (DD/MM/YYYY, IST)', () => {
  it('reads the IST calendar day, not the browser one', () => {
    // 20:00 UTC on 21 Oct is 01:30 IST on 22 Oct.
    expect(formatDate('2026-10-21T20:00:00Z')).toBe('22/10/2026');
    expect(formatDateTime('2026-10-21T20:00:00Z')).toBe('22/10/2026 01:30');
    expect(formatDate(new Date('2026-01-05T06:00:00Z'))).toBe('05/01/2026');
  });

  it('never prints "Invalid Date"', () => {
    expect(formatDate('not a date')).toBe('—');
    expect(formatDateTime('')).toBe('—');
  });
});

describe('useFormSubmit (Phase 0 form kit)', () => {
  it('ignores a second submit while the first is in flight', async () => {
    let finish: (value: string) => void = () => {};
    const action = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useFormSubmit<string>());

    let first: Promise<string | undefined> = Promise.resolve(undefined);
    act(() => {
      first = result.current.submit(action);
    });
    await act(async () => {
      await result.current.submit(action);
    });
    await act(async () => {
      finish('ok');
      await first;
    });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('reuses the key only after a network failure, and renews it after success', async () => {
    const keys: string[] = [];
    let outcome: 'network' | 'server' | 'ok' = 'network';
    const action = vi.fn(async (key: string) => {
      keys.push(key);
      if (outcome === 'network') {
        throw new ApiError({ code: 'NETWORK_ERROR', message: 'offline', retryable: true });
      }
      if (outcome === 'server') {
        throw new ApiError({ code: 'VALIDATION_FAILED', message: 'bad', field: 'firm' });
      }
      return 'done';
    });
    const { result } = renderHook(() => useFormSubmit<string>({ success: 'Saved it.' }));

    await act(async () => void (await result.current.submit(action)));
    await act(async () => void (await result.current.submit(action)));
    expect(keys[1]).toBe(keys[0]);

    outcome = 'server';
    await act(async () => void (await result.current.submit(action)));
    expect(keys[2]).toBe(keys[0]);
    expect(result.current.fieldErrors).toEqual({ firm: 'bad' });

    outcome = 'ok';
    await act(async () => void (await result.current.submit(action)));
    expect(keys[3]).not.toBe(keys[2]);
    expect(result.current.successMessage).toBe('Saved it.');
    expect(result.current.fieldErrors).toEqual({});

    await act(async () => void (await result.current.submit(action)));
    expect(keys[4]).not.toBe(keys[3]);
  });

  it('reports a duplicate with the clashing field and the existing record', async () => {
    const action = vi.fn(async () => {
      throw new ApiError({
        code: 'VALIDATION_FAILED',
        message: 'An account already exists for this GSTIN or mobile number.',
        field: 'gstin',
        meta: { existingCounterpartyId: 'abc123' },
      });
    });
    const { result } = renderHook(() => useFormSubmit<string>({ fields: ['gstin'] }));
    await act(async () => void (await result.current.submit(action)));
    expect(result.current.duplicate).toEqual({ field: 'gstin', existingId: 'abc123' });
    expect(result.current.fieldErrors.gstin).toMatch(/already exists/);
  });
});

describe('useFormSubmit — success on a form that closes (Phase 7, check 22)', () => {
  it('shows the success message as a toast when asked, so a closing modal still says it', async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <ToastProvider>{children}</ToastProvider>
    );
    const { result } = renderHook(
      () => useFormSubmit<string>({ success: 'Owner changed.', toastOnSuccess: true }),
      { wrapper },
    );
    await act(async () => {
      await result.current.submit(async () => 'ok');
    });
    expect(result.current.successMessage).toBe('Owner changed.');
    expect(await screen.findByText('Owner changed.')).toBeTruthy();
  });

  it('works outside the shell too (no toast provider) without throwing', async () => {
    const { result } = renderHook(() => useFormSubmit<string>({ toastOnSuccess: true }));
    await act(async () => {
      await result.current.submit(async () => 'ok');
    });
    expect(result.current.successMessage).toBe('Saved.');
  });
});

describe('splitFieldErrors', () => {
  const error = new ApiError({
    code: 'VALIDATION_FAILED',
    message: 'First problem.',
    fieldErrors: { firm: 'Enter the firm name.', 'consent.noticeVersion': 'Missing notice.' },
  });

  it('puts known fields next to the field and the rest on the form', () => {
    expect(splitFieldErrors(error, ['firm'])).toEqual({
      fieldErrors: { firm: 'Enter the firm name.' },
      formError: 'Missing notice.',
    });
  });

  it('falls back to the message when no field can be placed', () => {
    expect(splitFieldErrors(error, ['mobile'])).toEqual({
      fieldErrors: {},
      formError: 'First problem.',
    });
    const fieldless = new ApiError({ code: 'INTERNAL_ERROR', message: 'Server down.' });
    expect(splitFieldErrors(fieldless, undefined)).toEqual({
      fieldErrors: {},
      formError: 'Server down.',
    });
  });
});
