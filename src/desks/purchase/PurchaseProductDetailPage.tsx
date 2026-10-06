import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import {
  getMastersProducts,
  getProductAnalysis,
  getProductFunnelAll,
  getProductSellers,
  type ProductAnalysis,
  type ProductFunnelRow,
  type ProductSellerItem,
} from '../../api/purchase';
import { deliveryBandLabel, expiryBandLabel, formatRupees } from '../../lib/labels';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

interface Detail {
  brand: string;
  technical: string;
  manufacturerName: string;
  draft: boolean;
  funnel: ProductFunnelRow | null;
  analysis: ProductAnalysis;
  sellers: ProductSellerItem[];
}

/** One product's demand funnel and order/inspection splits — boxes and cases only, never a rupee figure. */
export function PurchaseProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const { callApi } = useAuth();
  const navigate = useNavigate();
  const loader = useCallback(
    () =>
      callApi(async (token): Promise<Detail> => {
        const [products, funnel, analysis, sellers] = await Promise.all([
          getMastersProducts(token),
          getProductFunnelAll(token),
          getProductAnalysis(token, productId!),
          getProductSellers(token, productId!),
        ]);
        const product = products.find((p) => p.productId === productId);
        return {
          brand: product?.brand ?? `…${productId!.slice(-6)}`,
          technical: product?.technical ?? '—',
          manufacturerName: product?.manufacturerName ?? '—',
          draft: product?.state === 'draft',
          funnel: funnel.find((f) => f.productId === productId) ?? null,
          analysis,
          sellers,
        };
      }),
    [callApi, productId],
  );
  const { state, retry } = useAsyncData(loader, () => false, [loader]);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" icon={<FiArrowLeft />} onClick={() => navigate('/purchase/products')}>
        Products
      </Button>
      <AsyncBoundary state={state} onRetry={retry}>
        {(d: Detail) => (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-semibold text-slate-900">
                {d.brand}
                {d.draft && (
                  <span className="ml-2 align-middle">
                    <Badge tone="warn">draft</Badge>
                  </span>
                )}
              </h1>
              <p className="text-sm text-slate-500">
                {d.technical} · {d.manufacturerName}
              </p>
            </div>

            <Card title="Demand, last 30 days">
              {d.funnel ? (
                <Table>
                  <thead>
                    <tr>
                      <Th numeric>Inquiries</Th>
                      <Th numeric>Quoted</Th>
                      <Th numeric>Never quoted</Th>
                      <Th numeric>Ordered</Th>
                      <Th numeric>Fill</Th>
                      <Th numeric>Open, boxes</Th>
                      <Th numeric>Sellers</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td numeric>{d.funnel.inq}</Td>
                      <Td numeric>{d.funnel.quoted}</Td>
                      <Td numeric>{d.funnel.inq - d.funnel.quoted}</Td>
                      <Td numeric className="font-semibold">
                        {d.funnel.ordered}
                      </Td>
                      <Td numeric>{d.funnel.fillPct === null ? '—' : `${d.funnel.fillPct}%`}</Td>
                      <Td numeric>{d.funnel.openBoxes}</Td>
                      <Td numeric>{d.funnel.sellerCount}</Td>
                    </tr>
                  </tbody>
                </Table>
              ) : (
                <p className="text-sm text-slate-500">No demand recorded for it.</p>
              )}
              <div className="mt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate(`/purchase/matrix?q=${encodeURIComponent(d.technical)}`)}
                >
                  Who could carry it →
                </Button>
              </div>
            </Card>

            <Card title="Sellers behind it">
              {d.sellers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No seller carries or lists it — a recruiting brief, not a leak.
                </p>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Seller</Th>
                      <Th>Pack</Th>
                      <Th numeric>Rate</Th>
                      <Th numeric>Qty</Th>
                      <Th>Conditions</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.sellers.flatMap((s) =>
                      s.listings.length === 0
                        ? [
                            <tr
                              key={s.sellerId}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => navigate(`/purchase/sellers/${s.sellerId}`)}
                            >
                              <Td className="font-medium text-brand-600">{s.firm}</Td>
                              <Td colSpan={4}>
                                <Badge tone="neutral">Carries it, not listed</Badge>
                              </Td>
                            </tr>,
                          ]
                        : s.listings.map((l, i) => (
                            <tr
                              key={`${s.sellerId}-${i}`}
                              className="cursor-pointer hover:bg-slate-50"
                              onClick={() => navigate(`/purchase/sellers/${s.sellerId}`)}
                            >
                              <Td className="font-medium text-brand-600">
                                {i === 0 ? s.firm : ''}
                              </Td>
                              <Td>{l.packLabel}</Td>
                              <Td numeric>{formatRupees(l.ratePaise)}</Td>
                              <Td numeric>{l.qty}</Td>
                              <Td>
                                <div className="flex flex-wrap gap-1">
                                  <Badge variant="chip">{expiryBandLabel(l.expiryBand)}</Badge>
                                  <Badge variant="chip">{deliveryBandLabel(l.deliveryBand)}</Badge>
                                  {l.moqExact > 1 && <Badge variant="chip">MOQ {l.moqExact}</Badge>}
                                </div>
                              </Td>
                            </tr>
                          )),
                    )}
                  </tbody>
                </Table>
              )}
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
              <Card title="Who ordered it (boxes, by trade position)">
                <Table>
                  <thead>
                    <tr>
                      <Th>Position</Th>
                      <Th numeric>Boxes</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(d.analysis.positionSplit).map(([position, boxes]) => (
                      <tr key={position}>
                        <Td>{position}</Td>
                        <Td numeric>{boxes}</Td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-900 font-semibold">
                      <Td>Total</Td>
                      <Td numeric>{d.analysis.totalBoxesOrdered}</Td>
                    </tr>
                  </tbody>
                </Table>
                {!d.analysis.positionSplitSumsCorrectly && (
                  <p className="mt-2 text-sm text-danger-500">
                    The split does not add up to the total — report this.
                  </p>
                )}
              </Card>

              <Card title="Inspection (cases)">
                <Table>
                  <thead>
                    <tr>
                      <Th>Outcome</Th>
                      <Th numeric>Cases</Th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <Td>Accepted</Td>
                      <Td numeric>{d.analysis.rejectionSplit.accepted}</Td>
                    </tr>
                    <tr>
                      <Td>Rejected</Td>
                      <Td numeric>{d.analysis.rejectionSplit.rejected}</Td>
                    </tr>
                    <tr className="border-t-2 border-slate-900 font-semibold">
                      <Td>Inspected</Td>
                      <Td numeric>{d.analysis.totalCasesInspected}</Td>
                    </tr>
                  </tbody>
                </Table>
                {!d.analysis.rejectionSplitSumsCorrectly && (
                  <p className="mt-2 text-sm text-danger-500">
                    Accepted plus rejected does not match the inspected lots — report this.
                  </p>
                )}
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
