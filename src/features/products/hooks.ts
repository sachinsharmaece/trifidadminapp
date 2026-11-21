import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import { useHsnCodes } from '@/features/hsnCodes/hooks';
import { useManufacturers } from '@/features/manufacturers/hooks';
import { useTechnicals } from '@/features/technicals/hooks';
import {
  addSku,
  createProduct,
  getProduct,
  listProducts,
  updateProduct,
  updateSku,
  type PackInput,
  type ProductDetailsInput,
  type ProductListParams,
} from './api';

const productsKey = ['products'] as const;

/** After any change, reload every product list and detail so the screens show what the server now has. */
const reloadProducts = () => queryClient.invalidateQueries({ queryKey: productsKey });

export function useProducts(params: ProductListParams, enabled = true) {
  return useQuery({
    queryKey: [...productsKey, 'list', params],
    queryFn: ({ signal }) => listProducts(params, signal),
    enabled,
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...productsKey, 'detail', id],
    queryFn: ({ signal }) => getProduct(id, signal),
  });
}

export function useCreateProduct() {
  return useMutation({ mutationFn: createProduct, onSuccess: reloadProducts });
}

export function useUpdateProduct() {
  return useMutation({
    mutationFn: (input: {
      id: string;
      changes: Partial<ProductDetailsInput> & { active?: boolean };
    }) => updateProduct(input.id, input.changes),
    onSuccess: reloadProducts,
  });
}

export function useAddSku() {
  return useMutation({
    mutationFn: (input: { productId: string; pack: PackInput }) =>
      addSku(input.productId, input.pack),
    onSuccess: reloadProducts,
  });
}

export function useUpdateSku() {
  return useMutation({
    mutationFn: (input: { id: string; changes: Partial<PackInput> & { active?: boolean } }) =>
      updateSku(input.id, input.changes),
    onSuccess: reloadProducts,
  });
}

/**
 * The manufacturers, technicals and HSN codes that products point at, plus helpers to show their names.
 * Products only store ids, so every screen that lists products uses this.
 */
export function useProductLookups() {
  const manufacturers = useManufacturers();
  const technicals = useTechnicals();
  const hsnCodes = useHsnCodes();
  const queries = [manufacturers, technicals, hsnCodes];

  return {
    isPending: queries.some((query) => query.isPending),
    errorMessage: queries.find((query) => query.isError)?.error?.message,
    manufacturers: manufacturers.data ?? [],
    technicals: technicals.data ?? [],
    hsnCodes: hsnCodes.data ?? [],
    manufacturerName: (id: string) =>
      manufacturers.data?.find((item) => item.id === id)?.name ?? '—',
    technicalName: (id: string) => technicals.data?.find((item) => item.id === id)?.name ?? '—',
    hsnCodeText: (id: string) => hsnCodes.data?.find((item) => item.id === id)?.code ?? '—',
  };
}
