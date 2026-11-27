import { useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';

type Tab = 'general' | 'credit' | 'reminders';

interface Setting {
  key: string;
  label: string;
  tab: Tab;
  value: string;
}

/**
 * Settings, as the reference (app/(admin)/settings). The server sends the label and tab of each key; the Credit
 * control and Payment reminders keys only reach Admin and Controller, so for anyone else the tabs never show.
 */
export function SettingsPage() {
  useDocumentTitle('Settings');
  const [settings, setSettings] = useState<Setting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('general');

  async function load() {
    const data = await refGet<{ settings: Setting[] }>('/settings');
    setSettings(data.settings ?? []);
  }

  useOnMount(load);

  async function save(key: string) {
    setError(null);
    const value = drafts[key] ?? settings.find((s) => s.key === key)?.value ?? '';
    const res = await refSend('PATCH', '/settings', { key, value });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  }

  const hasCreditTabAccess = settings.some((s) => s.tab !== 'general');
  const shown = settings.filter((s) => s.tab === (hasCreditTabAccess ? tab : 'general'));

  return (
    <div className="mx-auto max-w-md p-8">
      <h1 className="mb-4 text-lg font-semibold text-zinc-900">Settings</h1>

      {hasCreditTabAccess && (
        <div className="mb-4 flex gap-1 border-b border-zinc-200" role="tablist">
          {(
            [
              ['general', 'General'],
              ['credit', 'Credit control'],
              ['reminders', 'Payment reminders'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                tab === key
                  ? 'border-zinc-900 font-semibold text-zinc-900'
                  : 'border-transparent text-zinc-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {tab === 'credit' && hasCreditTabAccess && (
        <p className="mb-3 text-xs text-zinc-500">
          Visible only to Admin and Controller. Every change is written to the credit log.
        </p>
      )}
      {tab === 'reminders' && hasCreditTabAccess && (
        <p className="mb-3 text-xs text-zinc-500">
          WhatsApp reminders to buyers on credit bills. Visible only to Admin and Controller.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((s) => (
          <label key={s.key} className="flex flex-col gap-1 text-sm text-zinc-700">
            {s.label}
            <div className="flex gap-2">
              <input
                aria-label={s.label}
                value={drafts[s.key] ?? s.value}
                onChange={(e) => setDrafts({ ...drafts, [s.key]: e.target.value })}
                className="flex-1 rounded border border-zinc-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void save(s.key)}
                className="rounded border border-zinc-300 px-3 py-2 text-xs"
              >
                Save
              </button>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
