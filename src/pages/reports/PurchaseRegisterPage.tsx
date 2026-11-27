import { useState } from 'react';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import { ErrorState } from '@/components/molecules/ErrorState';
import { Pagination } from '@/components/molecules/Pagination';
import { PageLayout } from '@/components/templates/PageLayout';
import { usePurchaseRegister, useDownload } from '@/features/reports/hooks';
import { RegisterFilters } from '@/features/reports/RegisterFilters';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatDate, formatRupees, todayInIndia } from '@/utils/format';
import { TaxCell, monthStart } from './SalesRegisterPage';

const PAGE_SIZE = 25;

/**
 * The purchase register (SRS-RPT-03): one line for every lot the dock accepted, with the seller's own bill when
 * Purchase has entered it. It has the seller and his GSTIN, never the buyer or our selling rate. Purchase,
 * Accounts, Controller, Founder and Admin.
 */
export function PurchaseRegisterPage() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(todayInIndia);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search.trim());
  const params = { from, to, q, page, pageSize: PAGE_SIZE };
  const register = usePurchaseRegister(params);
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
      title="Purchase register"
      description="Every lot the dock accepted, with the seller, his GSTIN and his bill. Pick a range and download it as a CSV."
    >
      <RegisterFilters
        from={from}
        to={to}
        search={search}
        onFromChange={changed(setFrom)}
        onToChange={changed(setTo)}
        onSearchChange={changed(setSearch)}
        searchLabel="Search the purchase register"
        downloading={download.isPending}
        onDownload={() =>
          download.mutate({
            path: '/reports/purchase-register',
            params: { from, to, q, format: 'csv' },
            fallbackName: 'purchase-register.csv',
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
            <table
              aria-label="Purchase register"
              className="w-full min-w-[64rem] text-left text-sm"
            >
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Seller bill</th>
                  <th className="px-4 py-3 font-medium">Seller</th>
                  <th className="px-4 py-3 font-medium">Accepted on</th>
                  <th className="px-4 py-3 text-right font-medium">Taxable</th>
                  <th className="px-4 py-3 text-right font-medium">CGST</th>
                  <th className="px-4 py-3 text-right font-medium">SGST</th>
                  <th className="px-4 py-3 text-right font-medium">IGST</th>
                  <th className="px-4 py-3 text-right font-medium">Accepted total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {register.data.rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No accepted lots in this range.
                    </td>
                  </tr>
                )}
                {register.data.rows.map((row) => (
                  <tr key={row.voucherNumber}>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.sellerBill ? (
                        <>
                          <div className="font-medium">{row.sellerBill.number}</div>
                          <div className="text-xs text-slate-500">
                            {formatDate(row.sellerBill.billDate)} ·{' '}
                            {formatRupees(row.sellerBill.amountPaise)}
                          </div>
                        </>
                      ) : (
                        <Badge tone="warning">Bill awaited</Badge>
                      )}
                      <div className="text-xs text-slate-500">{row.poNumber}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.seller.firmName}</div>
                      <div className="text-xs text-slate-500">{row.gstin ?? 'No GSTIN'}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{formatDate(row.date)}</td>
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
                  <td colSpan={3} className="px-4 py-3">
                    Total of {register.data.totals.count} lot
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
            The totals cover every lot in the range, not only this page.
          </p>
        </>
      )}
    </PageLayout>
  );
}
