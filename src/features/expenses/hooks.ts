import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Attachment } from '@/shared/types';
import type { ExpenseInsert, ExpenseUpdate } from './types';

const KEY = ['expenses'] as const;

export function useExpenses() {
  return useQuery({ queryKey: KEY, queryFn: api.listExpenses });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: ExpenseInsert) => api.createExpense(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ExpenseUpdate }) => api.updateExpense(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachments }: { id: string; attachments: Attachment[] }) => api.deleteExpense(id, attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
