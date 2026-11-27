/** Our dock and trip rows, as the reference-copy Logistics screens read them. */
export interface DockLine {
  lineNo: number;
  productName: string;
  packLabel: string;
  boxes: number;
  batchDeclared: string | null;
  expiryDeclared: string | null;
  shortExpiryAgreed: boolean;
}
export interface DockLot {
  purchaseOrderId: string;
  number: string;
  status: string;
  tradeId: string;
  tradeVersion: number | null;
  from: string;
  boxes: number;
  lines: DockLine[];
  leg1: {
    mode: string;
    transporter: string | null;
    lrNumber: string | null;
    busDetails: string | null;
    driverMobile: string | null;
    note: string | null;
    dispatchedOn: string;
    at: string;
  } | null;
  daysOnRoad: number | null;
  transitOverdue: boolean;
  arrival: { arrivedAt: string; boxesCounted: number; billWithGoods: boolean } | null;
  inspectBy: string | null;
  result: {
    outcome: string;
    acceptedBoxes: number;
    savedAt: string;
    note: string | null;
    lines: {
      lineNo: number;
      boxesOnPo: number;
      boxesShort: number;
      boxesDamaged: number;
      boxesLeaking: number;
      boxesAccepted: number;
      batchFound: string | null;
      expiryFound: string | null;
    }[];
  } | null;
}
export interface BilledBill {
  salesOrderId: string;
  soNumber: string;
  margInvoiceNumber: string;
  destination: string;
  boxes: number;
  items: { productName: string; packLabel: string; boxes: number }[];
}
export interface TripBill {
  salesOrderId: string;
  soNumber: string;
  tradeId: string;
  tradeVersion: number | null;
  margInvoiceNumber: string;
  destination: string;
  boxes: number;
  bookWith: { mode: string; transporter: string | null };
  pod: { ref: string; date: string } | null;
}
export interface Trip {
  id: string;
  code: string;
  plannedDate: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
  vehicleType: string | null;
  status: 'PLANNED' | 'OUT' | 'CLOSED';
  bills: TripBill[];
  whatsappText: string | null;
  version: number;
}
export interface Vehicle {
  id: string;
  owner: string;
  mobile: string;
  vehicleNo: string;
  type: string;
  aadhaarLast4: string | null;
  hasDriverPhoto: boolean;
  hasVehiclePhoto: boolean;
}

export const bookWithText = (b: TripBill['bookWith']) =>
  b.mode === 'BUS'
    ? 'Bus (parcel)'
    : b.mode === 'DIRECT'
      ? 'Self delivery'
      : (b.transporter ?? 'Transport');

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`mb-3 flex flex-col gap-2 rounded-xl border bg-white p-3 ${highlight ? 'border-2 border-blue-400' : 'border-zinc-200'}`}
    >
      {children}
    </div>
  );
}

export function Pill({
  children,
  tone = 'mu',
}: {
  children: React.ReactNode;
  tone?: 'mu' | 'ok' | 'warn' | 'bad' | 'info';
}) {
  const tones: Record<string, string> = {
    mu: 'bg-zinc-100 text-zinc-600',
    ok: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-800',
    bad: 'bg-red-50 text-red-700',
    info: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`self-start rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
