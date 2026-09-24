export const CHAIN_STAGES = ['so', 'payment', 'po', 'leg1', 'marg', 'dispatch', 'done'];

/**
 * BR-031 — the six-stage chain strip, a required UI element on every SO, PO
 * and document screen. Shared by the chain desk and the enquiry journey.
 */
export function ChainStrip({ currentStage }: { currentStage: string }) {
  const currentIndex = CHAIN_STAGES.indexOf(currentStage);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {CHAIN_STAGES.map((stage, index) => (
        <li key={stage} className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              index < currentIndex
                ? 'bg-success-50 text-success-600'
                : index === currentIndex
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-500'
            }`}
          >
            {stage}
          </span>
          {index < CHAIN_STAGES.length - 1 && <span className="text-slate-300">→</span>}
        </li>
      ))}
    </ol>
  );
}
