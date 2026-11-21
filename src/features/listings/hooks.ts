import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/services/query/queryClient';
import {
  changeListingStatus,
  createListing,
  listListings,
  previewListing,
  type ListingInput,
  type ListingListParams,
} from './api';

const listingsKey = ['listings'] as const;

/** After any change, reload the list (and any open preview) so the screen shows what the server now has. */
const reloadListings = () => queryClient.invalidateQueries({ queryKey: listingsKey });

export function useListings(params: ListingListParams) {
  return useQuery({
    queryKey: [...listingsKey, 'list', params],
    queryFn: ({ signal }) => listListings(params, signal),
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}

/** Asks the server about an offer that is not saved yet. Pass null while the form is not complete. */
export function useListingPreview(input: ListingInput | null) {
  return useQuery({
    queryKey: [...listingsKey, 'preview', input],
    queryFn: ({ signal }) => {
      if (input === null) throw new Error('There is no offer to check yet.');
      return previewListing(input, signal);
    },
    enabled: input !== null,
    staleTime: 0, // duplicates and rate drops depend on what is saved right now
  });
}

export function useCreateListing() {
  return useMutation({ mutationFn: createListing, onSuccess: reloadListings });
}

export function useChangeListingStatus() {
  return useMutation({
    mutationFn: (input: { id: string; status: Parameters<typeof changeListingStatus>[1] }) =>
      changeListingStatus(input.id, input.status),
    onSuccess: reloadListings,
  });
}
