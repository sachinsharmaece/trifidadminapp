import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { ApiError } from '@/services/api/ApiError';
import { queryClient } from '@/services/query/queryClient';
import {
  createAsk,
  getTrade,
  listFunnel,
  openViewing,
  runAction,
  type ActionInputs,
  type FunnelParams,
  type FunnelSide,
  type Trade,
} from './api';

const tradesKey = ['trades'] as const;

/** Every trade query, so one change refreshes the card and both funnel lists. */
function refreshTrades(trade: Trade) {
  queryClient.setQueryData([...tradesKey, 'one', trade.id], trade);
  void queryClient.invalidateQueries({ queryKey: tradesKey });
}

export function useTrade(id: string) {
  return useQuery({
    queryKey: [...tradesKey, 'one', id],
    queryFn: ({ signal }) => getTrade(id, signal),
    staleTime: 0, // another desk may have acted: always ask the server
  });
}

export function useFunnel(side: FunnelSide, params: FunnelParams) {
  return useQuery({
    queryKey: [...tradesKey, side, params],
    queryFn: ({ signal }) => listFunnel(side, params, signal),
    staleTime: 0,
    placeholderData: keepPreviousData,
  });
}

export function useOpenViewing() {
  return useMutation({
    mutationFn: (input: { buyerId: string; listingId: string }) =>
      openViewing(input.buyerId, input.listingId),
    onSuccess: refreshTrades,
  });
}

export function useCreateAsk() {
  return useMutation({ mutationFn: createAsk, onSuccess: refreshTrades });
}

/** True when someone else moved the trade first, so this press was not saved. */
export function isChangedByOthers(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.code === 'STALE_TRADE' || error.code === 'WRONG_STAGE')
  );
}

/**
 * One engine button on one trade (the card, or a list row that knows only the trade's id and version).
 * `onChangedByOthers` runs when someone else acted first (409): the card then
 * reloads and shows the new stage.
 */
export function useTradeAction<A extends keyof ActionInputs>(
  trade: Pick<Trade, 'id' | 'version'>,
  action: A,
  onChangedByOthers?: () => void,
) {
  return useMutation({
    mutationFn: (input: ActionInputs[A]) => runAction(trade, action, input),
    onSuccess: refreshTrades,
    onError: (error) => {
      if (isChangedByOthers(error)) onChangedByOthers?.();
      void queryClient.invalidateQueries({ queryKey: [...tradesKey, 'one', trade.id] });
    },
  });
}
