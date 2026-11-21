import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { ErrorAlert } from '@/components/molecules/ErrorAlert';
import {
  EXPIRY_BAND_LABELS,
  LISTING_STATUS_LABELS,
  PROVENANCE_LABELS,
  type ListingStatus,
} from '@/types/listing';
import { formatDate, formatRupees } from '@/utils/format';
import type { Listing } from './api';
import { useChangeListingStatus } from './hooks';

interface ListingsTableProps {
  listings: readonly Listing[];
}

type BadgeTone = 'neutral' | 'success' | 'warning';
const STATUS_TONES: Record<ListingStatus, BadgeTone> = {
  ACTIVE: 'success',
  PAUSED: 'warning',
  EXPIRED: 'neutral',
  WITHDRAWN: 'neutral',
};

export function ListingsTable({ listings }: ListingsTableProps) {
  const change = useChangeListingStatus();

  function withdraw(listing: Listing) {
    const what = `${listing.sku?.productName ?? 'this product'} from ${listing.seller?.firmName ?? 'this seller'}`;
    if (!window.confirm(`Withdraw the listing for ${what}? It cannot be turned back on.`)) return;
    change.mutate({ id: listing.id, status: 'WITHDRAWN' });
  }

  return (
    <div className="space-y-3">
      <ErrorAlert message={change.error?.message} />
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[64rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Seller</th>
              <th className="px-4 py-3 font-medium">Product pack</th>
              <th className="px-4 py-3 font-medium">Rate per unit</th>
              <th className="px-4 py-3 font-medium">Box value</th>
              <th className="px-4 py-3 font-medium">Minimum / available</th>
              <th className="px-4 py-3 font-medium">Shelf life</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No listings found.
                </td>
              </tr>
            )}
            {listings.map((listing) => {
              const open = listing.status === 'ACTIVE' || listing.status === 'PAUSED';
              const working = change.isPending && change.variables.id === listing.id;
              return (
                <tr key={listing.id} className={open ? '' : 'text-slate-500'}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{listing.seller?.firmName}</div>
                    <div className="text-xs text-slate-500">{listing.seller?.number}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{listing.sku?.productName}</div>
                    <div className="text-xs text-slate-500">
                      {listing.sku?.packLabel} · {listing.sku?.unitsPerBox} per box
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {formatRupees(listing.ratePaisePerUnit)}
                    </div>
                    {listing.rateType === 'EX' &&
                    listing.exRatePaisePerUnit !== null &&
                    listing.colPaisePerBox !== null ? (
                      <div className="text-xs text-slate-500">
                        Ex {formatRupees(listing.exRatePaisePerUnit)} + COL{' '}
                        {formatRupees(listing.colPaisePerBox)} a box
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">FOR Indore</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {formatRupees(listing.boxValuePaise)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {listing.moqBoxes} / {listing.quantityBoxes} boxes
                  </td>
                  <td className="px-4 py-3">
                    <div className="whitespace-nowrap">
                      {EXPIRY_BAND_LABELS[listing.expiryBand]}
                    </div>
                    <div className="text-xs text-slate-500">
                      {PROVENANCE_LABELS[listing.provenance]}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONES[listing.status]}>
                      {LISTING_STATUS_LABELS[listing.status]}
                    </Badge>
                    <div className="mt-1 whitespace-nowrap text-xs text-slate-500">
                      {listing.status === 'EXPIRED' ? 'Ended' : 'Ends'}{' '}
                      {formatDate(listing.expiresAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {open && (
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <Button
                          variant="secondary"
                          size="sm"
                          loading={working}
                          onClick={() =>
                            change.mutate({
                              id: listing.id,
                              status: listing.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
                            })
                          }
                        >
                          {listing.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          disabled={working}
                          onClick={() => withdraw(listing)}
                        >
                          Withdraw
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
