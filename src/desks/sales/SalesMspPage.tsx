import { useCallback, useState } from 'react';
import { FiCheck, FiX } from 'react-icons/fi';
import { getMspQueue, respondToMsp } from '../../api/sales';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsyncData } from '../../lib/useAsyncData';
import { useAuth } from '../../auth/AuthContext';
import { Card } from '../../components/ui/Card';
import { Table, Th, Td } from '../../components/ui/Table';
import { Select } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

// `src/api/sales.ts#respondToMsp` only types `refusalCode` as a bare
// `string` (the frontend can't reach `trifidserverapp/src/models/MspRequest.ts`
// directly) — these are the four real codes from that model, copied here so
// the rep picks one instead of a single hardcoded refusal.
export type MspRefusalCode =
  | 'rate_not_available_right_now'
  | 'quantity_too_small_to_action'
  | 'no_seller_in_your_area'
  | 'already_at_the_best_available_rate';

const REFUSAL_CODES: { value: MspRefusalCode; label: string }[] = [
  { value: 'rate_not_available_right_now', label: 'Rate not available right now' },
  { value: 'quantity_too_small_to_action', label: 'Quantity too small to action' },
  { value: 'no_seller_in_your_area', label: 'No seller in your area' },
  { value: 'already_at_the_best_available_rate', label: 'Already at the best available rate' },
];

/** MSP requests (IC-07) — relocated from the old flat `SalesDeskPage`. */
export function SalesMspPage() {
  const { callApi } = useAuth();
  const loader = useCallback(() => callApi((token) => getMspQueue(token)), [callApi]);
  const { state, retry } = useAsyncData(loader, (items) => items.length === 0, [loader]);
  const [refusalCodes, setRefusalCodes] = useState<Record<string, MspRefusalCode>>({});

  return (
    <Card title="MSP requests (IC-07)">
      <p className="mb-4 text-sm text-slate-500">
        A refusal is always one of the fixed codes below — never a floor, a limit or a margin.
      </p>
      <AsyncBoundary state={state} onRetry={retry} emptyMessage="Nothing pending.">
        {(items) => (
          <Table>
            <thead>
              <tr>
                <Th>Buyer</Th>
                <Th>Qty</Th>
                <Th>If refusing</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const refusalCode = refusalCodes[item.mspRequestId] ?? REFUSAL_CODES[0].value;
                return (
                  <tr key={item.mspRequestId}>
                    <Td>{item.buyerId.slice(-6)}</Td>
                    <Td>{item.qty}</Td>
                    <Td>
                      <div className="w-56">
                        <Select
                          label="Refusal reason"
                          value={refusalCode}
                          onChange={(e) =>
                            setRefusalCodes((current) => ({
                              ...current,
                              [item.mspRequestId]: e.target.value as MspRefusalCode,
                            }))
                          }
                        >
                          {REFUSAL_CODES.map((code) => (
                            <option key={code.value} value={code.value}>
                              {code.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          icon={<FiCheck />}
                          onClick={() =>
                            void callApi((token) =>
                              respondToMsp(token, item.mspRequestId, { granted: true }),
                            ).then(retry)
                          }
                        >
                          Grant
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<FiX />}
                          onClick={() =>
                            void callApi((token) =>
                              respondToMsp(token, item.mspRequestId, {
                                granted: false,
                                refusalCode,
                              }),
                            ).then(retry)
                          }
                        >
                          Refuse
                        </Button>
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </AsyncBoundary>
    </Card>
  );
}
