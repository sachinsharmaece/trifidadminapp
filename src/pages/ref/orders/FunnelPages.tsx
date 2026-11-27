import { useParams } from 'react-router';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FunnelBoard } from './FunnelBoard';

/** Sales → Buyer funnels (all buyers, or one at /buyer-funnels/:partyId), as the reference. */
export function BuyerFunnelsPage() {
  useDocumentTitle('Buyer funnels');
  const { partyId } = useParams();
  return <FunnelBoard key={partyId ?? 'all'} side="buyer" partyId={partyId} />;
}

/** Purchase → Seller funnels (all sellers, or one at /seller-funnels/:partyId), as the reference. */
export function SellerFunnelsPage() {
  useDocumentTitle('Seller funnels');
  const { partyId } = useParams();
  return <FunnelBoard key={partyId ?? 'all'} side="seller" partyId={partyId} />;
}
