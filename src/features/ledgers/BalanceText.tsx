import { formatRupees } from '@/utils/format';
import type { Balance } from './api';

/** "₹50,000.00 Dr" / "₹50,000.00 Cr" / "Nil". */
export function BalanceText({ balance }: { balance: Balance }) {
  if (balance.paise === 0) return <span className="text-slate-500">Nil</span>;
  return (
    <span className="font-medium">
      {formatRupees(balance.paise)} {balance.side === 'DR' ? 'Dr' : 'Cr'}
    </span>
  );
}
