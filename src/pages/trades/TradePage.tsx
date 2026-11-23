import { Link, useParams } from 'react-router';
import { Badge } from '@/components/atoms/Badge';
import { Button } from '@/components/atoms/Button';
import { Spinner } from '@/components/atoms/Spinner';
import { ErrorState } from '@/components/molecules/ErrorState';
import { PageLayout } from '@/components/templates/PageLayout';
import { TradeActions } from '@/features/trades/TradeActions';
import { TradeFacts } from '@/features/trades/TradeFacts';
import { TradeHistory } from '@/features/trades/TradeHistory';
import { useTrade } from '@/features/trades/hooks';
import { BUYER_STAGE_LABELS, SELLER_STAGE_LABELS } from '@/types/trade';
import { dueText } from '@/utils/format';

/**
 * The deal card: one trade, its stage, the buttons for its next step, what each side may see, and its history.
 * Every button goes through the one trade engine on the server (Q-WF-01).
 */
export function TradePage() {
  const { id = '' } = useParams();
  const trade = useTrade(id);

  if (trade.isPending) return <Spinner label="Loading trade" className="h-6 w-6 text-brand-600" />;
  if (trade.isError) {
    return (
      <ErrorState title="Could not load this trade" message={trade.error.message}>
        <Button onClick={() => void trade.refetch()}>Try again</Button>
        <Link to="/" className="text-sm font-medium text-brand-700 hover:underline">
          Back to the dashboard
        </Link>
      </ErrorState>
    );
  }

  const data = trade.data;
  const overdue = data.due ? new Date(data.due.at) < new Date() : false;
  return (
    <PageLayout
      title={data.number}
      description={`${data.product.name}${data.pack ? ` · ${data.pack.packLabel}` : ''}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge tone="info">{BUYER_STAGE_LABELS[data.buyerStage]}</Badge>
        {data.sellerStage && <Badge tone="neutral">{SELLER_STAGE_LABELS[data.sellerStage]}</Badge>}
        {data.due && (
          <span className={overdue ? 'font-medium text-red-700' : 'text-slate-600'}>
            {data.due.label} {dueText(data.due.at)}
          </span>
        )}
      </div>
      {/* key: a new trade starts with no open form and no notice */}
      <TradeActions key={data.id} trade={data} />
      <TradeFacts trade={data} />
      <TradeHistory history={data.history} />
    </PageLayout>
  );
}
