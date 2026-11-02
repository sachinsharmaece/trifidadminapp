import { useState } from 'react';
import { ActionModal, useAction } from '../../components/ActionModal';
import { proxyAcceptPileOffer, proxyDeclinePileOffer } from '../../api/proxy';
import type { BuyerFilePileOffer } from '../../api/sales';
import { Button } from '../../components/ui/Button';
import { Table, Td, Th } from '../../components/ui/Table';
import { formatDateTime } from '../../lib/dates';
import { formatRupees } from '../../lib/labels';

/**
 * 2 Nov — BR-378. The seller confirmed the pile this buyer is on, so he has been given the deal: his
 * boxes, the expiry, his rate, held for 24 hours. It is his to take or walk away from; on a call
 * Sales does either on his word. Taking it makes his order and starts its payment window; walking
 * away puts the boxes back on the seller's listing.
 */
function summary(offer: BuyerFilePileOffer): string {
  const what = `${offer.brand}${offer.packLabel ? ` · ${offer.packLabel}` : ''}`;
  const rate = offer.ratePaise !== null ? ` at ${formatRupees(offer.ratePaise)}` : '';
  return `${what} — ${offer.boxes} boxes${rate}.`;
}

export function AcceptPileOfferButton({
  offer,
  counterpartyId,
  onDone,
}: {
  offer: BuyerFilePileOffer;
  counterpartyId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await proxyAcceptPileOffer(token, offer.requestId, {
      buyerCounterpartyId: counterpartyId,
      callNote,
    });
    return 'Order raised — now in Payment pending.';
  }, onDone);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Confirm
      </Button>
      <ActionModal
        open={open}
        title="He takes the deal"
        submitLabel="Confirm and raise the order"
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-700">{summary(offer)}</p>
        {offer.boxes < offer.askedBoxes && (
          <p className="mt-1 text-sm text-slate-600">
            He asked for {offer.askedBoxes}; the seller can send {offer.boxes}.
          </p>
        )}
        <p className="mt-1 text-sm text-slate-600">
          His order is made now, and his payment window starts.
        </p>
      </ActionModal>
    </>
  );
}

export function WalkAwayPileOfferButton({
  offer,
  counterpartyId,
  onDone,
}: {
  offer: BuyerFilePileOffer;
  counterpartyId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const submit = useAction(async (token, callNote) => {
    await proxyDeclinePileOffer(token, offer.requestId, {
      buyerCounterpartyId: counterpartyId,
      callNote,
    });
    return 'Walked away — the boxes are back on the listing.';
  }, onDone);
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        Walk away
      </Button>
      <ActionModal
        open={open}
        title="He walks away"
        submitLabel="Walk away"
        danger
        onClose={() => setOpen(false)}
        onSubmit={submit}
      >
        <p className="text-sm text-slate-700">{summary(offer)}</p>
        <p className="mt-1 text-sm text-slate-600">
          No order is made and the boxes go back on the seller&apos;s listing. This is free and
          counts nothing against him.
        </p>
      </ActionModal>
    </>
  );
}

/** The deals the seller confirmed for him, under "Rate given" beside the quotes on his asks. */
export function PileOffersTable({
  offers,
  counterpartyId,
  now,
  onDone,
}: {
  offers: BuyerFilePileOffer[];
  counterpartyId: string;
  now: number;
  onDone: () => void;
}) {
  if (offers.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-sm font-medium text-slate-700">
        Confirmed by the seller — his to take or walk away from
      </p>
      <Table>
        <thead>
          <tr>
            <Th>Product</Th>
            <Th numeric>Rate</Th>
            <Th numeric>Boxes</Th>
            <Th>Expiry</Th>
            <Th>Held until</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => {
            const hoursLeft = Math.max(0, Math.round((Date.parse(o.holdUntil) - now) / 3_600_000));
            return (
              <tr key={o.requestId}>
                <Td>
                  {o.brand}
                  {o.packLabel ? ` · ${o.packLabel}` : ''}
                </Td>
                <Td numeric>{o.ratePaise !== null ? formatRupees(o.ratePaise) : '—'}</Td>
                <Td numeric>
                  {o.boxes}
                  {o.boxes < o.askedBoxes && (
                    <div className="text-xs text-slate-500">of {o.askedBoxes} asked</div>
                  )}
                </Td>
                <Td>{o.expiryExact ?? '—'}</Td>
                <Td>
                  <div>{formatDateTime(o.holdUntil)}</div>
                  <div className="text-xs text-slate-500">{hoursLeft}h left</div>
                </Td>
                <Td>
                  <div className="flex flex-wrap justify-end gap-1">
                    <AcceptPileOfferButton
                      offer={o}
                      counterpartyId={counterpartyId}
                      onDone={onDone}
                    />
                    <WalkAwayPileOfferButton
                      offer={o}
                      counterpartyId={counterpartyId}
                      onDone={onDone}
                    />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
