import { useMutation, useQuery } from '@tanstack/react-query';
import { confirmPassword } from '@/features/auth/api';
import { queryClient } from '@/services/query/queryClient';
import { createMarginCell, listMarginCells, type MarginCellInput } from './api';

const marginsKey = ['margin-cells'] as const;

export function useMarginCells() {
  return useQuery({ queryKey: marginsKey, queryFn: ({ signal }) => listMarginCells(signal) });
}

/**
 * Saves a new margin line. The server wants a recent password check for this (step-up), so the
 * password is checked first and the line is saved right after.
 */
export function useCreateMarginCell() {
  return useMutation({
    mutationFn: async (input: { password: string; cell: MarginCellInput }) => {
      await confirmPassword(input.password);
      return createMarginCell(input.cell);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: marginsKey }),
  });
}
