import { Spinner } from '@/components/atoms/Spinner';

/** A spinner centered in the full window. Shown while the app decides what to display (e.g. checking the session). */
export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label={label} className="h-8 w-8 text-brand-600" />
    </div>
  );
}
