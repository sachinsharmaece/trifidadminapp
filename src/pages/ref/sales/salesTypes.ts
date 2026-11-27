/** Shapes the reference-copy Sales screens read from our API. */
export interface RefBuyer {
  id: string;
  number: string;
  firmName: string;
  contactName: string;
  mobiles: string[];
  gstin: string;
  tehsil: { name: string; district: string; state: string } | null;
  village: string;
  address: string;
  deliveryLocation: string;
  tradePosition: string;
  traderFlag: boolean;
  rateTier: string;
  classified: boolean;
  manufacturerIds: string[];
  active: boolean;
  createdAt: string;
}

export const tehsilText = (t: RefBuyer['tehsil']) =>
  t ? `${t.name} — ${t.district}, ${t.state}` : '—';

/** The reference's "time left to pay" line, never a negative number. */
export function paymentWindow(dueAt: string | null | undefined, now = new Date()) {
  if (!dueAt) return null;
  const ms = new Date(dueAt).getTime() - now.getTime();
  const hours = Math.abs(ms) / 3_600_000;
  const text =
    hours >= 24 ? `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h` : `${hours.toFixed(1)}h`;
  return ms < 0
    ? { overdue: true, label: `overdue by ${text}` }
    : { overdue: false, label: `${text} left to pay` };
}
