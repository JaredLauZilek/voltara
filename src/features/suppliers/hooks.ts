import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { SupplierInsert, SupplierUpdate } from './types';

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
