import { useRef, useState } from 'react';
import { useOnMount } from '@/hooks/useOnMount';
import { refSend } from '@/lib/refApi';
import { PoolCard } from './PoolCard';
import { TeamLeaderQueue } from './TeamLeaderQueue';
import { getOrError, type PoolCardData } from './dormancyTypes';

type Section = 'ordered' | 'leads';

function fetchSection(section: Section, search: string) {
  return getOrError<{ pool: PoolCardData[] }>('/dormancy/pool', {
    section,
    ...(search ? { search } : {}),
  });
}

/**
 * Buyers → Pool (reference components/dormancy/PoolTab, LOCK-34 §4.6/§4.8): "Ordered parties" and "New leads",
 * search, Claim, and for the Team Leader his "Waiting 3+ days" block above everything else.
 */
export function PoolTab({ isTeamLeader }: { isTeamLeader: boolean }) {
  const [search, setSearch] = useState('');
  const [ordered, setOrdered] = useState<PoolCardData[]>([]);
  const [leads, setLeads] = useState<PoolCardData[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const latest = useRef(0);

  /** Loads both sections; an answer to an older search (typed over since) is dropped. */
  async function load(q: string) {
    const mine = ++latest.current;
    const [orderedRes, leadsRes] = await Promise.all([
      fetchSection('ordered', q),
      fetchSection('leads', q),
    ]);
    if (mine !== latest.current) return;
    if ('error' in orderedRes) {
      setError(orderedRes.error);
    } else {
      setOrdered(orderedRes.data.pool ?? []);
      setError(null);
    }
    if ('data' in leadsRes) setLeads(leadsRes.data.pool ?? []);
  }

  useOnMount(() => load(''));

  async function onClaim(partyId: string) {
    setMessage(null);
    const res = await refSend('POST', '/dormancy/claim', { partyId });
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setMessage("Claimed — it's now in your book.");
    await load(search);
  }

  return (
    <div className="flex flex-col gap-6">
      {isTeamLeader && <TeamLeaderQueue onChanged={() => void load(search)} />}
      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          void load(e.target.value);
        }}
        placeholder="Search by name, tehsil, district…"
        aria-label="Search the Pool"
        className="min-h-11 rounded border border-zinc-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-xs text-zinc-600">{message}</p>}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">Ordered parties ({ordered.length})</h2>
        {!error && ordered.length === 0 && <p className="text-xs text-zinc-400">Nothing here.</p>}
        {ordered.map((card) => (
          <PoolCard key={card.partyId} card={card} onClaim={(id) => void onClaim(id)} />
        ))}
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-zinc-900">New leads ({leads.length})</h2>
        {!error && leads.length === 0 && <p className="text-xs text-zinc-400">Nothing here.</p>}
        {leads.map((card) => (
          <PoolCard key={card.partyId} card={card} onClaim={(id) => void onClaim(id)} />
        ))}
      </section>
    </div>
  );
}
