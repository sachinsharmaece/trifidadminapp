import { useState } from 'react';
import { useParams } from 'react-router';
import { CreditCard } from '@/components/ref/credit/CreditCard';
import { RequestLimitForm } from '@/components/ref/credit/RequestLimitForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FunnelBoard } from './FunnelBoard';

/**
 * Sales → Buyer funnels (all buyers, or one at /buyer-funnels/:partyId), as the reference. One buyer's page also
 * shows his credit card and "Request limit" (Fast order); Sales never edits credit here.
 */
export function BuyerFunnelsPage() {
  useDocumentTitle('Buyer funnels');
  const { partyId } = useParams();
  const [refreshKey, setRefreshKey] = useState(0);
  if (!partyId) return <FunnelBoard key="all" side="buyer" />;
  return (
    <div className="flex flex-col gap-3">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-4 sm:px-8 sm:pt-8">
        <CreditCard buyerId={partyId} refreshKey={refreshKey} />
        <RequestLimitForm buyerId={partyId} onSent={() => setRefreshKey((k) => k + 1)} />
      </div>
      <FunnelBoard key={partyId} side="buyer" partyId={partyId} />
    </div>
  );
}

/** Purchase → Seller funnels (all sellers, or one at /seller-funnels/:partyId), as the reference. */
export function SellerFunnelsPage() {
  useDocumentTitle('Seller funnels');
  const { partyId } = useParams();
  return <FunnelBoard key={partyId ?? 'all'} side="seller" partyId={partyId} />;
}
