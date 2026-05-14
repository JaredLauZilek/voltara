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

const ENTITY_KEY = ['expense_entities'] as const;

export function useExpenseEntities() {
  return useQuery({ queryKey: ENTITY_KEY, queryFn: api.listExpenseEntities });
}

export function useCreateExpenseEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createExpenseEntity(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTITY_KEY }),
  });
}

export function useDeleteExpenseEntity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteExpenseEntity(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ENTITY_KEY }),
  });
}

const CATEGORY_KEY = ['expense_categories'] as const;

export function useExpenseCategories() {
  return useQuery({ queryKey: CATEGORY_KEY, queryFn: api.listExpenseCategories });
}

export function useCreateExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createExpenseCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORY_KEY }),
  });
}

export function useDeleteExpenseCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteExpenseCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: CATEGORY_KEY }),
  });
}
