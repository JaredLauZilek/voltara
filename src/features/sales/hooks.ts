import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { QuoteInsert, QuoteUpdate } from './types';

export function useQuotes() {
  return useQuery({ queryKey: ['quotes'], queryFn: api.listQuotes });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: QuoteInsert) => api.createQuote(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: QuoteUpdate }) => api.updateQuote(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteQuote(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  });
}
