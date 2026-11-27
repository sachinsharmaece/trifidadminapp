import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { refGet } from '@/lib/refApi';
import { formatPaiseAsINR } from '@/lib/refMoney';

interface ExposureRow {
  name: string;
  usedPaise: number;
}

/** Exposure by executive and by reference (Controller), copied from the reference. Our API: GET /credit/exposure. */
export function ExposureSummaries() {
  const [byExecutive, setByExecutive] = useState<ExposureRow[]>([]);
  const [byReference, setByReference] = useState<ExposureRow[]>([]);
  useOnMount(async () => {
    const data = await refGet<{ byExecutive: ExposureRow[]; byReference: ExposureRow[] }>(
      '/credit/exposure',
    );
    setByExecutive(data.byExecutive ?? []);
    setByReference(data.byReference ?? []);
  });
  const box = (title: string, rows: ExposureRow[]) => (
    <div className="rounded border border-zinc-200 bg-white p-3">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      {rows.map((r) => (
        <div key={r.name} className="flex justify-between py-1 text-sm">
          <span>{r.name}</span>
          <strong>{formatPaiseAsINR(r.usedPaise)}</strong>
        </div>
      ))}
      {rows.length === 0 && <p className="text-sm text-zinc-400">No credit used yet.</p>}
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {box('Exposure by executive', byExecutive)}
      {box('Exposure by reference', byReference)}
    </div>
  );
}
