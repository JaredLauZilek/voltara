import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { SupplierInsert, SupplierUpdate, SupplierKind } from './types';

export function useSuppliers() {
  return useQuery({ queryKey: ['suppliers'], queryFn: api.listSuppliers });
}

export function useSuppliersWithStats() {
  return useQuery({ queryKey: ['suppliers', 'with-stats'], queryFn: api.listSuppliersWithStats });
}

export function useCreateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: SupplierInsert) => api.createSupplier(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useUpdateSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SupplierUpdate }) => api.updateSupplier(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useDeleteSupplier() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });
}

export function useSupplierCategories(kind: SupplierKind) {
  return useQuery({
    queryKey: ['supplier_categories', kind],
    queryFn: () => api.listSupplierCategories(kind),
  });
}

export function useCreateSupplierCategory(kind: SupplierKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.createSupplierCategory(kind, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier_categories', kind] }),
  });
}

export function useDeleteSupplierCategory(kind: SupplierKind) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api.deleteSupplierCategory(kind, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['supplier_categories', kind] }),
  });
}
