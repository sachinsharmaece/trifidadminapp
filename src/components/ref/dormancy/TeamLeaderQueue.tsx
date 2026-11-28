import { useState } from 'react';
import { NamePicker, type NamePickerOption } from '@/components/ref/NamePicker';
import { useOnMount } from '@/hooks/useOnMount';
import { refSend } from '@/lib/refApi';
import { formatDateIST } from '@/lib/refMoney';
import { getOrError } from './dormancyTypes';

interface QueueRow {
  partyId: string;
  partyName: string;
  tehsil: string | null;
  district: string;
  poolEnteredAt: string;
}

interface StaffRow {
  id: string;
  name: string;
  receivingLeads: boolean;
}

interface CallerRow {
  id: string;
  name: string;
  uncalledCount: number;
  cap: number;
  canAssign: boolean;
}

/**
 * The Sales Team Leader's block on the Pool tab (reference components/dormancy/TeamLeaderQueue, LOCK-34 §4.8): the
 * "Receiving leads" switch for each caller, and "Waiting 3+ days" with Assign and Leave.
 */
export function TeamLeaderQueue({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [callerOptions, setCallerOptions] = useState<NamePickerOption[]>([]);
  const [chosenCallerId, setChosenCallerId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);

  async function load() {
    const res = await getOrError<{ queue: QueueRow[] }>('/dormancy/team-leader/queue');
    if ('data' in res) setRows(res.data.queue ?? []);
  }
  async function loadStaff() {
    const res = await getOrError<{ staff: StaffRow[] }>('/dormancy/team-leader/staff');
    if ('data' in res) setStaff(res.data.staff ?? []);
  }
  useOnMount(async () => {
    await Promise.all([load(), loadStaff()]);
  });

  async function toggleReceivingLeads(staffId: string, on: boolean) {
    setError(null);
    const res = await refSend('PATCH', `/users/${staffId}/receiving-leads`, { on });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await loadStaff();
  }

  async function openAssign(partyId: string) {
    setError(null);
    setAssigning(partyId);
    setChosenCallerId(undefined);
    const res = await getOrError<{ callers: CallerRow[] }>('/dormancy/team-leader/callers', {
      partyId,
    });
    setCallerOptions(
      ('data' in res ? res.data.callers : []).map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: `uncalled ${c.uncalledCount} / ${c.cap}${c.canAssign ? '' : ' — over cap'}`,
      })),
    );
  }

  async function confirmAssign() {
    if (!assigning || !chosenCallerId) return;
    const res = await refSend('POST', '/dormancy/team-leader/assign', {
      partyId: assigning,
      callerId: chosenCallerId,
    });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setAssigning(null);
    await load();
    onChanged();
  }

  async function leave(partyId: string) {
    setError(null);
    const res = await refSend('POST', '/dormancy/team-leader/leave', { partyId });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded border border-zinc-200 p-4">
        <h2 className="text-sm font-semibold text-zinc-900">Receiving leads</h2>
        {staff.map((s) => (
          <label
            key={s.id}
            className="flex items-center justify-between gap-2 text-sm text-zinc-700"
          >
            {s.name}
            <input
              type="checkbox"
              checked={s.receivingLeads}
              onChange={(e) => void toggleReceivingLeads(s.id, e.target.checked)}
              className="h-5 w-5"
            />
          </label>
        ))}
      </div>
      {rows.length > 0 && (
        <div className="flex flex-col gap-3 rounded border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Waiting 3+ days</h2>
          {error && <p className="text-xs text-red-600">{error}</p>}
          {rows.map((row) => (
            <div
              key={row.partyId}
              className="flex flex-col gap-2 rounded border border-amber-200 bg-white p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-zinc-900">{row.partyName}</p>
                  <p className="text-xs text-zinc-500">
                    {row.tehsil ? `${row.tehsil} — ` : ''}
                    {row.district} · in Pool since {formatDateIST(row.poolEnteredAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void openAssign(row.partyId)}
                    className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-xs"
                  >
                    Assign
                  </button>
                  <button
                    type="button"
                    onClick={() => void leave(row.partyId)}
                    className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-xs"
                  >
                    Leave
                  </button>
                </div>
              </div>
              {assigning === row.partyId && (
                <div className="flex items-center gap-2 border-t border-amber-100 pt-2">
                  <NamePicker
                    options={callerOptions}
                    value={chosenCallerId}
                    onChange={setChosenCallerId}
                    placeholder="Search callers…"
                  />
                  <button
                    type="button"
                    onClick={() => void confirmAssign()}
                    disabled={!chosenCallerId}
                    className="min-h-11 rounded bg-zinc-900 px-3 py-2 text-xs text-white disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
