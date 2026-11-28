import { formatDateIST } from '@/lib/refMoney';
import type { PoolCardData } from './dormancyTypes';

/**
 * One Pool buyer (reference components/dormancy/PoolCard, LOCK-34 §4.6): exactly the spec's fields. No mobile, no
 * GSTIN, no amounts: those appear only after a claim, in the normal buyer file.
 */
export function PoolCard({
  card,
  onClaim,
}: {
  card: PoolCardData;
  onClaim: (partyId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">{card.partyName}</p>
          <p className="text-xs text-zinc-500">
            {card.tehsil ? `${card.tehsil} — ` : ''}
            {card.district}, {card.state}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onClaim(card.partyId)}
          disabled={!card.canClaim}
          title={card.claimRefusedReason ?? undefined}
          className="min-h-11 shrink-0 rounded bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Claim
        </button>
      </div>
      {card.claimRefusedReason && (
        <p className="text-xs text-amber-600">{card.claimRefusedReason}</p>
      )}
      {card.previousHolders.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-zinc-500">
          {card.previousHolders.map((h, i) => (
            <li key={i}>
              {h.name} · {formatDateIST(h.from)} – {h.to ? formatDateIST(h.to) : ''} · {h.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
