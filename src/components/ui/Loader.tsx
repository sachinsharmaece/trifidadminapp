import { FiLoader } from 'react-icons/fi';

export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-12 text-slate-500">
      <FiLoader className="animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}
