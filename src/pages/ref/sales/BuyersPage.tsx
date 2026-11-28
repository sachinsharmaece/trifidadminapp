import { useState } from 'react';
import { Link } from 'react-router';
import { useOnMount } from '@/hooks/useOnMount';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { refGet, refSend } from '@/lib/refApi';
import { tierLabel } from '@/lib/refLabels';
import { formatDateIST } from '@/lib/refMoney';
import { MyBookTab } from '@/components/ref/dormancy/MyBookTab';
import { PoolTab } from '@/components/ref/dormancy/PoolTab';
import type { DormancyMe } from '@/components/ref/dormancy/dormancyTypes';
import { tehsilText, type RefBuyer } from './salesTypes';

type Tab = 'book' | 'pool';

/**
 * Sales → Buyers, as the reference (app/(sales)/buyers). With the dormant policy on (DORMANCY_ENABLED) the page is
 * two tabs instead, "In the book" and "Pool"; with it off, the plain list. The list follows the staff hierarchy
 * scope on the server (a junior sees only his own buyers when STAFF_HIERARCHY_ENABLED is on).
 */
export function BuyersPage() {
  useDocumentTitle('Buyers');
  const [buyers, setBuyers] = useState<RefBuyer[]>([]);
  const [dormancy, setDormancy] = useState<DormancyMe | null>(null);
  const [tab, setTab] = useState<Tab>('book');

  async function load() {
    const data = await refGet<{ buyers: RefBuyer[] }>('/buyers', { pageSize: 100 });
    setBuyers(data.buyers ?? []);
  }

  useOnMount(async () => {
    await load();
    setDormancy(await refGet<DormancyMe>('/dormancy/me'));
  });

  async function classify(id: string) {
    await refSend('POST', `/buyers/${id}/classify`);
    await load();
  }

  const tabClass = (t: Tab) =>
    `min-h-11 px-3 py-2 text-sm font-medium ${tab === t ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-500'}`;

  if (dormancy?.enabled) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900">Buyers</h1>
          <Link
            to="/buyers/new"
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Register buyer
          </Link>
        </div>
        <div className="mb-4 flex gap-2 border-b border-zinc-200">
          <button type="button" onClick={() => setTab('book')} className={tabClass('book')}>
            In the book
          </button>
          <button type="button" onClick={() => setTab('pool')} className={tabClass('pool')}>
            Pool
          </button>
        </div>
        {tab === 'book' ? <MyBookTab /> : <PoolTab isTeamLeader={dormancy.isTeamLeader} />}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-900">Buyers</h1>
        <Link
          to="/buyers/new"
          className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Register buyer
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500">
            <th className="py-2">Name</th>
            <th className="py-2">Tehsil</th>
            <th className="py-2">Rate tier</th>
            <th className="py-2">Registered</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {buyers.map((b) => (
            <tr key={b.id} className="border-t border-zinc-100 hover:bg-zinc-50">
              <td className="py-2">
                <Link to={`/buyers/${b.id}`} className="block text-zinc-900">
                  {b.firmName}
                </Link>
              </td>
              <td className="py-2">{tehsilText(b.tehsil)}</td>
              <td className="py-2">
                {tierLabel(b.rateTier)}
                {!b.classified && <span className="ml-1 text-xs text-amber-600">(indicative)</span>}
              </td>
              <td className="py-2">{formatDateIST(b.createdAt)}</td>
              <td className="py-2">
                {!b.classified && (
                  <button
                    type="button"
                    onClick={() => void classify(b.id)}
                    className="text-xs text-zinc-500 underline hover:text-zinc-900"
                  >
                    Classify now
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
