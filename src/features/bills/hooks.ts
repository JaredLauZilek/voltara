import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { Attachment } from '@/shared/types';
import type { BillInsert, BillUpdate } from './types';

const KEY = ['bills'] as const;

export function useBills() {
  return useQuery({ queryKey: KEY, queryFn: api.listBills });
}

export function useCreateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: BillInsert) => api.createBill(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: BillUpdate }) => api.updateBill(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachments }: { id: string; attachments: Attachment[] }) => api.deleteBill(id, attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

const CAT_KEY = ['bill_categories'] as const;

export function useBillCategories() {
  return useQuery({ queryKey: CAT_KEY, queryFn: api.listBillCategories });
}

export function useCreateBillCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createBillCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAT_KEY }),
  });
}

export function useDeleteBillCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteBillCategory(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: CAT_KEY }),
  });
}
