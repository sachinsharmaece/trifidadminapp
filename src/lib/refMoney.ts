/** Money and date helpers copied from the reference (lib/money.ts, lib/dates.ts). Money is whole paise. */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/** 12800000 -> "₹1,28,000.00" (Indian grouping). */
export function formatPaiseAsINR(paise: number): string {
  const negative = paise < 0;
  const absPaise = Math.abs(Math.round(paise));
  const rupees = Math.floor(absPaise / 100);
  const rest = absPaise % 100;
  const text = String(rupees);
  const lastThree = text.slice(-3);
  const head = text.slice(0, -3);
  const grouped =
    head === '' ? lastThree : head.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
  return `${negative ? '-' : ''}₹${grouped}.${String(rest).padStart(2, '0')}`;
}

export function computeBoxValuePaise(ratePaisePerUnit: number, unitsPerBox: number): number {
  return Math.round(ratePaisePerUnit * unitsPerBox);
}

/** Ex rate per unit + COL per box spread over the units in a box = the landing rate per unit. */
export function computeLandingRatePaisePerUnit(
  exRatePaise: number,
  colPaisePerBox: number,
  unitsPerBox: number,
) {
  return Math.round(exRatePaise + colPaisePerBox / unitsPerBox);
}

const IST = 'Asia/Kolkata';

/** DD/MM/YYYY in Indian time (optionally with HH:mm). */
export function formatDateIST(value: string | Date, withTime = false): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).formatToParts(typeof value === 'string' ? new Date(value) : value);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = `${get('day')}/${get('month')}/${get('year')}`;
  return withTime ? `${day} ${get('hour')}:${get('minute')}` : day;
}

/** Today's date in Indian time as YYYY-MM-DD (the date fields our API takes). */
export function todayIST(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(new Date());
}
