import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ToastOptions {
  undo?: () => void;
}

interface ToastState {
  message: string;
  undo?: () => void;
}

interface ToastContextValue {
  show: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 2500;
const UNDO_DURATION_MS = 4500;

/**
 * A single floating toast, app-wide — no toast library, plain React state and
 * the same fixed-position/portal convention `Modal.tsx` already uses. Only
 * one toast shows at a time; a new `show()` replaces whatever is there.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast(null);
  }, []);

  const show = useCallback((message: string, opts?: ToastOptions) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, undo: opts?.undo });
    timeoutRef.current = setTimeout(
      () => setToast(null),
      opts?.undo ? UNDO_DURATION_MS : DEFAULT_DURATION_MS,
    );
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast &&
        createPortal(
          <div
            role="status"
            className="fixed right-6 bottom-6 z-50 flex items-center gap-3 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
          >
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => {
                  toast.undo?.();
                  dismiss();
                }}
                className="rounded-md px-2 py-1 font-semibold text-brand-300 hover:bg-white/10"
              >
                Undo
              </button>
            )}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

/** Any page inside `<ToastProvider>` (wrapped once at the app shell) can call this. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
