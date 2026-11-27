export const CHAIN_STAGES = ['SO', 'PAYMENT', 'PO', 'LEG1', 'MARG', 'DISPATCH'] as const;
export type ChainStageKey = (typeof CHAIN_STAGES)[number];

const STAGE_LABELS: Record<ChainStageKey, string> = {
  SO: 'SO',
  PAYMENT: 'Payment',
  PO: 'PO',
  LEG1: 'Leg 1',
  MARG: 'Marg',
  DISPATCH: 'Dispatch',
};

/** Where a PO is in the chain (reference lib/chain.ts), for a PO that exists (so the SO is paid). */
export function chainOfPo(po: {
  arrived: boolean;
  inspected: boolean;
  billed: boolean;
  marg: boolean;
  leg2: boolean;
}) {
  const completed: ChainStageKey[] = ['SO', 'PAYMENT', 'PO'];
  if (!(po.arrived && po.inspected && po.billed))
    return { current: 'LEG1' as ChainStageKey, completed };
  completed.push('LEG1');
  if (!po.marg) return { current: 'MARG' as ChainStageKey, completed };
  completed.push('MARG');
  if (po.leg2) completed.push('DISPATCH');
  return { current: 'DISPATCH' as ChainStageKey, completed };
}

/** The six-stage strip on SO and PO screens, copied from the reference (components/layout/ChainStrip.tsx). */
export function ChainStrip({
  currentStage,
  completedStages,
}: {
  currentStage: ChainStageKey;
  completedStages: ChainStageKey[];
}) {
  return (
    <div className="flex gap-1">
      {CHAIN_STAGES.map((stage) => {
        const done = completedStages.includes(stage);
        const current = stage === currentStage;
        return (
          <div
            key={stage}
            className={`flex-1 rounded px-2 py-2 text-center text-xs font-medium ${
              current
                ? 'bg-zinc-900 text-white'
                : done
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-zinc-100 text-zinc-400'
            }`}
          >
            {STAGE_LABELS[stage]}
          </div>
        );
      })}
    </div>
  );
}
