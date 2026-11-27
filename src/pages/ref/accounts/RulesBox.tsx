/** The green "Rules" box at the foot of every Accounts screen, as in the reference. */
export function RulesBox({ rules }: { rules: string[] }) {
  return (
    <div className="mt-4 rounded border border-zinc-200 border-l-4 border-l-emerald-700 bg-white p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Rules</p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-zinc-700">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ol>
    </div>
  );
}
