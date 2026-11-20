import { cn } from '@/lib/cn';

interface SpinnerProps {
  /** Read out by screen readers. */
  label?: string;
  className?: string;
}

/** A small spinning ring. Size it with a className such as "h-8 w-8". */
export function Spinner({ label = 'Loading', className }: SpinnerProps) {
  return (
    <svg
      role="status"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('h-5 w-5 animate-spin', className)}
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
