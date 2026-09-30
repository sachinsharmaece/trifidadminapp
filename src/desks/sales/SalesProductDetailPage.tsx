import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import {
  getSalesBoardProduct,
  type BoardLadderLine,
  type BoardOpenAsk,
  type BoardProductDetail,
} from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  askStateLabel,
  deliveryBandLabel,
  expiryBandLabel,
  formatRupees,
  moqBandLabel,
  provenanceLabel,
} from '../../lib/labels';

function formatRate(ratePaise: number | null): string {
  return ratePaise === null ? '—' : formatRupees(ratePaise);
}

function sortedLadder(ladder: BoardLadderLine[]): BoardLadderLine[] {
  return [...ladder].sort((a, b) => {
    if (a.ratePaise === null && b.ratePaise === null) return 0;
    if (a.ratePaise === null) return 1;
    if (b.ratePaise === null) return -1;
    return a.ratePaise - b.ratePaise;
  });
}

function askStateTone(state: string): 'warn' | 'good' | 'neutral' {
  if (state === 'open') return 'warn';
  if (state === 'quoted') return 'good';
  return 'neutral';
}

/** One product's rate ladder, plus the demand still open against it. */
export function SalesProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(
    () => callApi((token) => getSalesBoardProduct(token, productId!)),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/sales/products')}>
        Products
      </Button>
      <AsyncBoundary state={state} onRetry={retry}>
        {(detail: BoardProductDetail) => {
          const ladder = sortedLadder(detail.ladder);
          return (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{detail.brand}</h1>
                <p className="text-sm text-slate-500">
                  {detail.technicalName} · {detail.manufacturerName}
                </p>
              </div>

              <Card title="The rate ladder">
                {ladder.length === 0 ? (
                  <p className="text-sm text-slate-500">Nothing listed against it.</p>
                ) : (
                  <>
                    <Table>
                      <thead>
                        <tr>
                          <Th numeric>Rate</Th>
                          <Th>Conditions</Th>
                          <Th numeric>Qty</Th>
                          <Th numeric>Tehsils reached</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {ladder.map((line) => (
                          <tr key={line.listingLineId}>
                            <Td numeric className="font-medium">
                              {formatRate(line.ratePaise)}
                            </Td>
                            <Td>
                              <div className="flex flex-wrap gap-1">
                                <Badge variant="chip">{expiryBandLabel(line.expiryBand)}</Badge>
                                <Badge variant="chip">{moqBandLabel(line.moqBand)}</Badge>
                                <Badge variant="chip">{deliveryBandLabel(line.deliveryBand)}</Badge>
                                <Badge variant="chip">{provenanceLabel(line.provenance)}</Badge>
                              </div>
                            </Td>
                            <Td numeric>{line.qty}</Td>
                            <Td numeric>{line.tehsilCount}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <p className="mt-3 text-sm text-slate-500">
                      Cheapest is almost never what a small retailer can actually take — a big MOQ
                      is a conversation worth having with him, not a reason to hide the rate.
                    </p>
                  </>
                )}
              </Card>

              <Card title="Demand against it">
                {detail.openAsks.length === 0 ? (
                  <p className="text-sm text-slate-500">Nobody has asked for it.</p>
                ) : (
                  <Table>
                    <thead>
                      <tr>
                        <Th>Buyer</Th>
                        <Th numeric>Qty</Th>
                        <Th>State</Th>
                        <Th>Raised</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.openAsks.map((ask: BoardOpenAsk) => (
                        <tr key={ask.askId}>
                          <Td>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/sales/buyers/${ask.buyerId}`)}
                            >
                              {ask.buyerFirm || `…${ask.buyerId.slice(-6)}`}
                            </Button>
                          </Td>
                          <Td numeric>{ask.qty}</Td>
                          <Td>
                            <Badge tone={askStateTone(ask.state)}>{askStateLabel(ask.state)}</Badge>
                          </Td>
                          <Td>{new Date(ask.createdAt).toLocaleString()}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </div>
          );
        }}
      </AsyncBoundary>
    </div>
  );
}
