import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { billingRows } from '@/features/billing/billingRows';
import { ComplaintLines } from '@/features/complaints/ComplaintLines';
import { RefundLine } from '@/features/payouts/RefundLine';
import { sellerPayoutRows } from '@/features/payouts/payoutText';
import {
  PurchaseOrderStatusBadge,
  purchaseOrderProgressRows,
} from '@/features/purchaseOrders/PurchaseOrderProgress';
import { SalesOrderStatusBadge } from '@/features/salesOrders/SalesOrderStatusBadge';
import { Badge } from '@/components/atoms/Badge';
import { EXPIRY_BAND_LABELS, PROVENANCE_LABELS } from '@/types/listing';
import { RATE_TIER_LABELS } from '@/types/party';
import { RECEIPT_STATUS_LABELS, RECEIPT_STATUS_TONES } from '@/types/books';
import { ASK_REASON_LABELS } from '@/types/trade';
import { formatDate, formatDateTime, formatRupees } from '@/utils/format';
import type { Trade } from './api';

/** A titled box of label/value rows. */
function Section({
  title,
  rows,
  children,
}: {
  title: string;
  rows: [string, ReactNode][];
  children?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </section>
  );
}

const rateText = (paise: number | null) =>
  paise === null ? (
    <span className="text-xs font-medium text-amber-700">
      Rate unavailable: margin cell missing
    </span>
  ) : (
    formatRupees(paise)
  );

/**
 * What the deal card shows. The API already left out what this person may not see (the visibility wall), so this
 * only shows the parts that came back: the buyer side for Sales, the seller side for Purchase, both for supervisors.
 */
export function TradeFacts({ trade }: { trade: Trade }) {
  const what: [string, ReactNode][] = [
    ['Product', trade.product.name],
    [
      'Pack',
      trade.pack
        ? `${trade.pack.packLabel} (${trade.pack.unitsPerBox} per box)`
        : 'Any pack (Purchase picks)',
    ],
    ['Boxes wanted', trade.boxesWanted ?? '—'],
    ['Came from', trade.source === 'LISTED' ? 'The rate board' : 'An ask (not listed)'],
  ];
  if (trade.ask) {
    what.push(['Why he asked', ASK_REASON_LABELS[trade.ask.reason]]);
    if (trade.ask.note) what.push(['Ask note', trade.ask.note]);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="What" rows={what} />

      {trade.buyer && (
        <Section
          title="Buyer side"
          rows={[
            ['Buyer', `${trade.buyer.number} · ${trade.buyer.firmName}`],
            ...(trade.salesOrder
              ? ([
                  [
                    'Sales order',
                    <span key="so" className="inline-flex flex-wrap items-center gap-2">
                      <Link
                        to={`/sales-orders/${trade.salesOrder.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {trade.salesOrder.number}
                      </Link>
                      <SalesOrderStatusBadge status={trade.salesOrder.status} />
                      {formatRupees(trade.salesOrder.totalPaise)}
                    </span>,
                  ],
                ] as [string, ReactNode][])
              : []),
            ...(trade.offer
              ? ([
                  ['Our rate per unit', rateText(trade.offer.buyerRatePaisePerUnit)],
                  [
                    'Box value',
                    trade.offer.boxValuePaise === null
                      ? '—'
                      : formatRupees(trade.offer.boxValuePaise),
                  ],
                  ['Boxes offered', trade.offer.boxes],
                  ['Expiry month', trade.offer.expiryMonth],
                  ['Priced as', RATE_TIER_LABELS[trade.offer.tier]],
                ] as [string, ReactNode][])
              : trade.boardOffer
                ? ([
                    ['Board rate per unit', rateText(trade.boardOffer.buyerRatePaisePerUnit)],
                    [
                      'Minimum / available',
                      `${trade.boardOffer.moqBoxes} / ${trade.boardOffer.quantityBoxes} boxes`,
                    ],
                    ['Shelf life', EXPIRY_BAND_LABELS[trade.boardOffer.expiryBand]],
                    ['Priced as', RATE_TIER_LABELS[trade.boardOffer.tier]],
                  ] as [string, ReactNode][])
                : []),
          ]}
        >
          {trade.advance && trade.advance.totalPaise > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3" data-testid="advance-panel">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Advance waiting · {formatRupees(trade.advance.totalPaise)}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                This buyer paid ahead. Accounts can use it on this order.
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {trade.advance.payments.map((payment) => (
                  <li key={payment.number}>
                    <span className="font-medium">{formatRupees(payment.unspentPaise)}</span>{' '}
                    <span className="text-xs text-slate-500">
                      {payment.number} · UTR {payment.utr} · {payment.receivedOn}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {trade.payments !== undefined && trade.salesOrder && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Payments · due {formatRupees(trade.balanceDuePaise ?? 0)}
              </h3>
              {trade.payments.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">None entered yet.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {trade.payments.map((payment) => (
                    <li key={payment.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{formatRupees(payment.amountPaise)}</span>
                        <Badge tone={RECEIPT_STATUS_TONES[payment.status]}>
                          {RECEIPT_STATUS_LABELS[payment.status]}
                        </Badge>
                        {payment.isAdvance && <Badge tone="info">From advance</Badge>}
                        {payment.receiptPaise !== payment.amountPaise && (
                          <span className="text-xs text-slate-500">
                            of {formatRupees(payment.receiptPaise)} received
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">
                        {payment.number} · UTR {payment.utr} · {payment.bankName} ·{' '}
                        {payment.receivedOn}
                      </div>
                      {payment.rejectNote && (
                        <div className="text-xs text-red-700">{payment.rejectNote}</div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {trade.billing && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Billing and delivery
              </h3>
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                {billingRows(trade.billing).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="text-slate-900">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {trade.refunds && trade.refunds.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Refund to the buyer ·{' '}
                {formatRupees(trade.refunds.reduce((sum, refund) => sum + refund.amountPaise, 0))}
              </h3>
              <ul className="mt-2 text-sm">
                {trade.refunds.map((refund) => (
                  <RefundLine key={refund.id} refund={refund} />
                ))}
              </ul>
            </div>
          )}
          {trade.complaints && (trade.complaints.length > 0 || trade.complaintByAt) && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <h3 className="text-xs font-semibold uppercase text-slate-500">
                Complaints
                {trade.complaintByAt
                  ? ` · the buyer may complain until ${formatDate(trade.complaintByAt)}`
                  : ''}
              </h3>
              {trade.complaints.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">None.</p>
              ) : (
                <ComplaintLines complaints={trade.complaints} />
              )}
            </div>
          )}
          {trade.leakage && (
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Lost {formatDateTime(trade.leakage.at)}: {trade.leakage.reasonLabel}
              {trade.leakage.note ? ` (${trade.leakage.note})` : ''}. Reopen it if the buyer comes
              back.
            </p>
          )}
          {(trade.offer?.indicative ?? trade.boardOffer?.indicative) && (
            <p className="mt-3 text-xs text-slate-500">
              <Badge tone="warning">Indicative</Badge> The buyer is not classified yet, so he is
              priced as a Retailer.
            </p>
          )}
          {trade.boardOffer && !trade.boardOffer.live && !trade.offer && (
            <p className="mt-3 text-xs text-amber-700">
              This offer is no longer on the board. Sending it goes to Purchase to find a seller.
            </p>
          )}
        </Section>
      )}

      {trade.seller !== undefined && (
        <Section
          title="Seller side"
          rows={[
            [
              'Seller',
              trade.seller ? `${trade.seller.number} · ${trade.seller.firmName}` : 'Not chosen yet',
            ],
            ...(trade.purchaseOrder
              ? ([
                  [
                    'Purchase order',
                    <span key="po" className="inline-flex flex-wrap items-center gap-2">
                      <Link
                        to={`/purchase-orders/${trade.purchaseOrder.id}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {trade.purchaseOrder.number}
                      </Link>
                      <PurchaseOrderStatusBadge status={trade.purchaseOrder.status} />
                      {formatRupees(trade.purchaseOrder.totalPaise)}
                    </span>,
                  ],
                  ...purchaseOrderProgressRows(trade.purchaseOrder),
                  ...sellerPayoutRows(trade.payout, trade.purchaseOrder.status === 'CHECKED'),
                ] as [string, ReactNode][])
              : []),
            ...(trade.listing
              ? ([
                  [
                    'Listing rate (landed) per unit',
                    formatRupees(trade.listing.landedPaisePerUnit),
                  ],
                  [
                    'Minimum / listed',
                    `${trade.listing.moqBoxes} / ${trade.listing.quantityBoxes} boxes`,
                  ],
                  ['Shelf life', EXPIRY_BAND_LABELS[trade.listing.expiryBand]],
                  ['Stock', PROVENANCE_LABELS[trade.listing.provenance]],
                ] as [string, ReactNode][])
              : []),
            ...(trade.sellerAnswer
              ? ([
                  [
                    trade.sellerAnswer.kind === 'QUOTED' ? 'Quoted' : 'Confirmed',
                    `${trade.sellerAnswer.boxes} boxes on ${formatDateTime(trade.sellerAnswer.at)}`,
                  ],
                  [
                    'Seller rate (landed) per unit',
                    formatRupees(trade.sellerAnswer.landedPaisePerUnit),
                  ],
                  ['Expiry month', trade.sellerAnswer.expiryMonth],
                  ['Batch', trade.sellerAnswer.batchNumber ?? '—'],
                  ...(trade.sellerAnswer.moqBoxes
                    ? ([
                        [
                          'Seller minimum / has',
                          `${trade.sellerAnswer.moqBoxes} / ${trade.sellerAnswer.boxesAvailable ?? '—'} boxes`,
                        ],
                      ] as [string, ReactNode][])
                    : []),
                ] as [string, ReactNode][])
              : []),
          ]}
        />
      )}
    </div>
  );
}
