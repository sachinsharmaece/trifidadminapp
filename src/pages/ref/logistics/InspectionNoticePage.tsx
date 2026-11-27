import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/** Logistics → Inspection, as the reference: a notice; inspection is done per line on the Dock screen. */
export function InspectionNoticePage() {
  useDocumentTitle('Inspection');
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Inspection</h1>
      <p className="text-sm text-zinc-500">
        This screen is being replaced by a new per-line Inspect flow (DOCK-FLOW, LOCK-40) and is not
        live yet. The old outer-box-only form has been retired so it cannot record an inspection
        that no longer matches how payouts and return notes are computed.
      </p>
    </div>
  );
}
