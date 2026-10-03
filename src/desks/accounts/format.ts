/** Money arrives in paise; the desk shows rupees, with paise only when there are some. */
export const inr = (paise: number): string => {
  const rupees = Math.abs(paise) / 100;
  const text = rupees.toLocaleString('en-IN', {
    minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${paise < 0 ? '−₹' : '₹'}${text}`;
};

export const num = (n: number): string => Number(n).toLocaleString('en-IN');

export const bxs = (n: number): string => `${num(n)} ${Number(n) === 1 ? 'box' : 'boxes'}`;

/** A rupee figure typed by staff, as paise. NaN if it is not a number. */
export const toPaise = (rupees: string): number => Math.round(Number(rupees) * 100);
