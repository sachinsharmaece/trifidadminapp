import { PageLayout } from '@/components/templates/PageLayout';
import { FunnelView } from '@/features/trades/FunnelView';

/** Sales' trades by buyer stage (b1 to b4 so far). Open a trade from the Rate board. */
export function BuyerFunnelsPage() {
  return (
    <PageLayout
      title="Buyer funnels"
      description="Every trade on the buyer side, by stage. Open new ones from the Rate board."
    >
      <FunnelView side="buyer" />
    </PageLayout>
  );
}
