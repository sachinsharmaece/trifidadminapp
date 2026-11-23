import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getSalesOrder, listSalesOrders, type SalesOrderListParams } from './api';

/** Under ['trades'] too, so a deal card button (buyer says yes, drops the order) also refreshes these. */
const salesOrdersKey = ['trades', 'sales-orders'] as const;

export function useSalesOrders(params: SalesOrderListParams) {
  return useQuery({
    queryKey: [...salesOrdersKey, params],
    queryFn: ({ signal }) => listSalesOrders(params, signal),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: [...salesOrdersKey, 'one', id],
    queryFn: ({ signal }) => getSalesOrder(id, signal),
  });
}
