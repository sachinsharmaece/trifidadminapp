import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getPurchaseOrder, listPurchaseOrders } from './api';

/** Under ['trades'], so confirming a payment (which raises a PO) refreshes these too. */
const purchaseOrdersKey = ['trades', 'purchase-orders'] as const;

export function usePurchaseOrders(params: { q: string; page: number; pageSize: number }) {
  return useQuery({
    queryKey: [...purchaseOrdersKey, params],
    queryFn: ({ signal }) => listPurchaseOrders(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: [...purchaseOrdersKey, 'one', id],
    queryFn: ({ signal }) => getPurchaseOrder(id, signal),
  });
}
