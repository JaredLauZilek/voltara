import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { QuoteSetInsert, QuoteSetUpdate } from './types';

const KEY = ['quote_sets'];

export function useQuoteSets() {
  return useQuery({ queryKey: KEY, queryFn: api.listQuoteSets });
}

export function useCreateQuoteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: QuoteSetInsert) => api.createQuoteSet(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateQuoteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: QuoteSetUpdate }) => api.updateQuoteSet(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteQuoteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteQuoteSet(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
