import { PageLayout } from '@/components/templates/PageLayout';
import { FunnelView } from '@/features/trades/FunnelView';

/** Purchase's queue: trades waiting for a seller to be found (s0) or to confirm (s1). */
export function SellerFunnelsPage() {
  return (
    <PageLayout
      title="Seller funnels"
      description="Trades sent to the seller side: find a seller (s0) or get his confirmation (s1)."
    >
      <FunnelView side="seller" />
    </PageLayout>
  );
}
