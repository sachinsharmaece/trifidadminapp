import { z } from 'zod';
import { FREIGHT_TERMS, LEG1_MODES } from '@/types/dock';
import { checkForm, rupeesToPaise, wholeNumber } from './fields';

/** Form rules for leg 1, the seller's bill, the arrival and the dock check. The server checks everything again. */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters`)
    .transform((text) => text || undefined);
const optionalMonth = z
  .string()
  .regex(/^(\d{4}-(0[1-9]|1[0-2]))?$/, 'Choose a month')
  .transform((text) => text || undefined);
const day = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export interface DispatchLineValues {
  lineNo: number;
  batchDeclared: string;
  expiryDeclared: string;
  shortExpiryAgreed: boolean;
}
export interface DispatchValues {
  mode: (typeof LEG1_MODES)[number];
  transporter: string;
  lrNumber: string;
  lrDate: string;
  busDetails: string;
  driverName: string;
  driverMobile: string;
  note: string;
  freightTerms: (typeof FREIGHT_TERMS)[number];
  freight: string;
  dispatchedOn: string;
  lines: DispatchLineValues[];
}

/** "Record dispatch": what each mode needs, and the freight only when it is to pay at Indore. */
export const validateDispatch = (values: DispatchValues) =>
  checkForm(
    z
      .object({
        mode: z.enum(LEG1_MODES),
        transporter: optionalText(120),
        lrNumber: optionalText(60),
        lrDate: z.string().transform((text) => text || undefined),
        busDetails: optionalText(200),
        driverName: optionalText(100),
        driverMobile: z
          .string()
          .trim()
          .regex(/^(\d{10})?$/, 'A mobile number has 10 digits')
          .transform((text) => text || undefined),
        note: optionalText(300),
        freightTerms: z.enum(FREIGHT_TERMS),
        freight: z.string(),
        dispatchedOn: day('Choose the dispatch date'),
        lines: z.array(
          z.object({
            lineNo: z.number(),
            batchDeclared: optionalText(60),
            expiryDeclared: optionalMonth,
            shortExpiryAgreed: z.boolean(),
          }),
        ),
      })
      .superRefine((form, ctx) => {
        const need = (path: string, message: string) =>
          ctx.addIssue({ code: 'custom', path: [path], message });
        if (form.mode === 'TRANSPORT') {
          if (!form.transporter) need('transporter', 'Enter the transport company');
          if (!form.lrNumber) need('lrNumber', 'Enter the LR number');
        }
        if (form.mode === 'BUS') {
          if (!form.busDetails) need('busDetails', 'Enter the bus (operator, number)');
          if (!form.driverMobile) need('driverMobile', "Enter the driver's mobile");
        }
        if (form.mode === 'DEPOT' && !form.note) {
          need('note', 'Say which depot and who is bringing the goods');
        }
        if (form.freightTerms === 'TO_PAY' && !form.freight.trim()) {
          need('freight', 'Enter the freight we pay at Indore');
        } else if (
          form.freightTerms === 'TO_PAY' &&
          !/^\d{1,9}(\.\d{1,2})?$/.test(form.freight.trim())
        ) {
          need('freight', 'Use an amount like 1500 or 1499.50');
        }
      })
      .transform(({ freight, ...form }) => {
        const freightPaise =
          form.freightTerms === 'TO_PAY'
            ? rupeesToPaise('Enter the freight', 1_000_000).safeParse(freight)
            : null;
        // Keep only what applies to the mode (the server stores what it is sent).
        return {
          mode: form.mode,
          freightTerms: form.freightTerms,
          dispatchedOn: form.dispatchedOn,
          lines: form.lines,
          note: form.note,
          ...(form.mode === 'TRANSPORT'
            ? { transporter: form.transporter, lrNumber: form.lrNumber, lrDate: form.lrDate }
            : {}),
          ...(form.mode === 'BUS'
            ? {
                busDetails: form.busDetails,
                driverName: form.driverName,
                driverMobile: form.driverMobile,
              }
            : {}),
          ...(freightPaise?.success ? { freightPaise: freightPaise.data } : {}),
        };
      }),
    values,
  );

export interface SellerBillValues {
  number: string;
  amount: string;
  billDate: string;
}
/** "Seller bill": his invoice number, amount and date. */
export const validateSellerBill = (values: SellerBillValues) =>
  checkForm(
    z
      .object({
        number: z.string().trim().min(1, "Enter the seller's bill number").max(40),
        amount: rupeesToPaise('Enter the bill amount', 1_000_000_000),
        billDate: day('Choose the bill date'),
      })
      .transform(({ amount, ...rest }) => ({ ...rest, amountPaise: amount })),
    values,
  );

export interface ArrivalValues {
  /** From `<input type="datetime-local">`: "2026-11-26T14:30", local time. */
  arrivedAt: string;
  boxesCounted: string;
  billWithGoods: boolean;
}
/** "Goods arrived": when, how many boxes were counted, and whether the seller's bill came too. */
export const validateArrival = (values: ArrivalValues) =>
  checkForm(
    z.object({
      arrivedAt: z
        .string()
        .min(1, 'Enter when the goods arrived')
        .transform((text) => new Date(text))
        .refine((date) => !Number.isNaN(date.getTime()), 'Enter when the goods arrived')
        .transform((date) => date.toISOString()),
      boxesCounted: wholeNumber('Enter how many boxes arrived', 1, 1_000_000),
      billWithGoods: z.boolean(),
    }),
    values,
  );

export interface InspectionLineValues {
  lineNo: number;
  batchFound: string;
  expiryFound: string;
  damaged: string;
  leaking: string;
  excess: string;
}
export interface InspectionValues {
  lines: InspectionLineValues[];
  note: string;
}
const count = wholeNumber('Enter a number of boxes (0 if none)', 0, 1_000_000);

/** "Check the goods": per line, batch and expiry found and the damaged, leaking and extra boxes. */
export const validateInspection = (values: InspectionValues) =>
  checkForm(
    z.object({
      lines: z.array(
        z
          .object({
            lineNo: z.number(),
            batchFound: optionalText(60),
            expiryFound: optionalMonth,
            damaged: count,
            leaking: count,
            excess: count,
          })
          .transform(({ damaged, leaking, excess, ...line }) => ({
            ...line,
            damagedBoxes: damaged,
            leakingBoxes: leaking,
            excessBoxes: excess,
          })),
      ),
      note: optionalText(500),
    }),
    values,
  );

/**
 * What the check will come to, worked out like the server does: short boxes = ordered − counted, taken from
 * the lines in PO order; accepted = on the PO − short − damaged − leaking. For the live preview only.
 */
export function previewInspection(
  lines: { lineNo: number; boxes: number }[],
  boxesCounted: number,
  typed: { lineNo: number; damaged: string; leaking: string }[],
) {
  const ordered = lines.reduce((sum, line) => sum + line.boxes, 0);
  let shortLeft = Math.max(0, ordered - boxesCounted);
  const toNumber = (text: string | undefined) => (/^\d+$/.test(text ?? '') ? Number(text) : 0);
  const perLine = lines.map((line) => {
    const short = Math.min(shortLeft, line.boxes);
    shortLeft -= short;
    const given = typed.find((item) => item.lineNo === line.lineNo);
    const accepted = line.boxes - short - toNumber(given?.damaged) - toNumber(given?.leaking);
    return { lineNo: line.lineNo, short, accepted };
  });
  return { ordered, extra: Math.max(0, boxesCounted - ordered), perLine };
}
