import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { PageLayout } from '@/components/templates/PageLayout';
import { useDownload, useSalesRegister } from '@/features/reports/hooks';
import { RegisterFilters } from '@/features/reports/RegisterFilters';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate, formatRupees, todayInIndia } from '@/utils/format';

const PAGE_SIZE = 25;

/** A tax column: zero shows as a dash so the eye finds the one that applies (CGST + SGST, or IGST). */
export function TaxCell({ paise }: { paise: number }) {
  return (
    <td className="whitespace-nowrap px-4 py-3 text-right">
      {paise === 0 ? <span className="text-slate-400">–</span> : formatRupees(paise)}
    </td>
  );
}

/** The first day of this month, India (the default start of a register). */
export const monthStart = () => `${todayInIndia().slice(0, 8)}01`;

/**
 * The sales register (SRS-RPT-02): one line for every Marg bill, read from the SALES vouchers. It has the buyer and his
 * GSTIN and the GST split, never the seller or a rate. Accounts, Controller, Founder and Admin.
 */
export function SalesRegisterPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayInIndia);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const params = { from, to, q, page, pageSize: PAGE_SIZE };
  const register = useSalesRegister(params);
  const download = useDownload();

  // A new filter starts again from page 1.
  const changed =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value);
      setPage(1);
    };

  return (
    <PageLayout
      title="Sales register"
      description="Every bill keyed from Marg, with the buyer, his GSTIN and the GST. Pick a range and download it as a CSV for your tax filing."
    >
      <RegisterFilters
        from={from}
        to={to}
        search={search}
        onFromChange={changed(setFrom)}
        onToChange={changed(setTo)}
        onSearchChange={changed(setSearch)}
        searchLabel="Search the sales register"
        downloading={download.isPending}
        onDownload={() =>
          download.mutate({
            path: '/reports/sales-register',
            params: { from, to, q, format: 'csv' },
            fallbackName: 'sales-register.csv',
          })
        }
      />
      <ErrorAlert message={download.error?.message} />

      {register.isPending && (
        <Spinner label="Loading the register" className="h-6 w-6 text-brand-600" />
      )}
      {register.isError && (
        <ErrorState title="Could not load the register" message={register.error.message}>
          <Button onClick={() => void register.refetch()}>Try again</Button>
        </ErrorState>
      )}
      {register.isSuccess && (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table aria-label="Sales register" className="w-full min-w-[60rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Buyer</th>
                  <th className="px-4 py-3 font-medium">E-way bill</th>
                  <th className="px-4 py-3 text-right font-medium">Taxable</th>
                  <th className="px-4 py-3 text-right font-medium">CGST</th>
                  <th className="px-4 py-3 text-right font-medium">SGST</th>
                  <th className="px-4 py-3 text-right font-medium">IGST</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {register.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No bills in this range.
                    </td>
                  </tr>
                )}
                {register.data.rows.map((row) => (
                  <tr key={row.voucherNumber}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="font-medium">{row.invoiceNumber}</div>
                      <div className="text-xs text-slate-500">
                        {row.orderNumber ?? row.voucherNumber}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.date)}</td>
                    <td className="px-4 py-3">
                      <div>{row.buyer.firmName}</div>
                      <div className="text-xs text-slate-500">{row.gstin ?? 'No GSTIN'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {row.ewayBillNumber ?? <span className="text-slate-400">–</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {formatRupees(row.taxablePaise)}
                    </td>
                    <TaxCell paise={row.cgstPaise} />
                    <TaxCell paise={row.sgstPaise} />
                    <TaxCell paise={row.igstPaise} />
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                      {formatRupees(row.totalPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50 font-medium">
                <tr>
                  <td colSpan={4} className="px-4 py-3">
                    Total of {register.data.totals.count} bill
                    {register.data.totals.count === 1 ? '' : 's'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(register.data.totals.taxablePaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(register.data.totals.cgstPaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(register.data.totals.sgstPaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(register.data.totals.igstPaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {formatRupees(register.data.totals.totalPaise)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={register.data.total}
            onPageChange={setPage}
          />
          <p className="text-xs text-slate-500">
            The totals cover every bill in the range, not only this page. See also the{' '}
            <Link to="/reports/trial-balance" className="text-brand-700 hover:underline">
              trial balance
            </Link>
            .
          </p>
        </>
      )}
    </PageLayout>
  );
}
