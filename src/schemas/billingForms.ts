import { z } from 'zod';
import { BOOK_WITH_MODES } from '@/types/dock';
import { checkForm, rupeesToPaise, wholeNumber } from './fields';

/** Form rules for the Marg bill, trips and the proof of dispatch. The server checks everything again. */

const day = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export interface MargBillValues {
  invoiceNumber: string;
  ewayBillNumber: string;
  billDate: string;
  total: string;
  lines: { lineNo: number; boxes: string }[];
}

/** "Marg bill": the invoice number, e-way bill, date, total and boxes billed per line. */
export const validateMargBill = (values: MargBillValues) =>
  checkForm(
    z
      .object({
        invoiceNumber: z.string().trim().min(1, 'Enter the Marg invoice number').max(40),
        ewayBillNumber: z
          .string()
          .trim()
          .max(40)
          .transform((text) => text || undefined),
        billDate: day('Choose the bill date'),
        total: rupeesToPaise('Enter the bill total', 1_000_000_000),
        lines: z.array(
          z.object({
            lineNo: z.number(),
            boxes: wholeNumber('Enter the boxes billed', 0, 1_000_000),
          }),
        ),
      })
      .transform(({ total, ...rest }) => ({ ...rest, totalPaise: total })),
    values,
  );

export interface PodValues {
  ref: string;
  date: string;
}

/** "Proof of dispatch": the LR or receipt number and its date. */
export const validatePod = (values: PodValues) =>
  checkForm(
    z.object({
      ref: z.string().trim().min(1, 'Enter the LR or receipt number').max(80),
      date: day('Choose the date'),
    }),
    values,
  );

export interface TripValues {
  plannedDate: string;
  vehicleNumber: string;
  driverName: string;
  driverMobile: string;
}

/** "New trip": the date, the vehicle and its driver. */
export const validateTrip = (values: TripValues) =>
  checkForm(
    z.object({
      plannedDate: day('Choose the trip date'),
      vehicleNumber: z.string().trim().min(4, 'Enter the vehicle number').max(20),
      driverName: z.string().trim().min(1, "Enter the driver's name").max(100),
      driverMobile: z
        .string()
        .trim()
        .regex(/^\d{10}$/, 'A mobile number has 10 digits'),
    }),
    values,
  );

export interface AddBillValues {
  tripId: string;
  mode: (typeof BOOK_WITH_MODES)[number];
  transporter: string;
}

/** "Add to trip": which planned trip, and how the bill goes on from our vehicle. */
export const validateAddBill = (values: AddBillValues) =>
  checkForm(
    z
      .object({
        tripId: z.string().min(1, 'Choose a planned trip'),
        mode: z.enum(BOOK_WITH_MODES),
        transporter: z.string().trim().max(120),
      })
      .superRefine((form, ctx) => {
        if (form.mode === 'TRANSPORT' && !form.transporter) {
          ctx.addIssue({
            code: 'custom',
            path: ['transporter'],
            message: 'Enter the transport company',
          });
        }
      })
      .transform((form) => ({
        tripId: form.tripId,
        bookWith: {
          mode: form.mode,
          ...(form.mode === 'TRANSPORT' ? { transporter: form.transporter } : {}),
        },
      })),
    values,
  );
