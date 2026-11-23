import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getBoard, type BoardParams } from './api';

/** The rate board for one buyer. Pass null until a buyer is chosen. */
export function useBoard(buyerId: string | null, params: BoardParams) {
  return useQuery({
    queryKey: ['board', buyerId, params],
    queryFn: ({ signal }) => {
      if (buyerId === null) throw new Error('Choose a buyer first.');
      return getBoard(buyerId, params, signal);
    },
    enabled: buyerId !== null,
    staleTime: 0, // a quoted rate must come from what is saved right now, not from a 30-second-old copy
    placeholderData: keepPreviousData, // keep showing the old page while the next one loads
  });
}
