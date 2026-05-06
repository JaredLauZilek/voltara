import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { SalesManagerInsert, SalesManagerUpdate } from './types';

export function useSalesManagers() {
  return useQuery({ queryKey: ['sales_managers'], queryFn: api.listSalesManagers });
}

export function useCreateSalesManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: SalesManagerInsert) => api.createSalesManager(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales_managers'] }),
  });
}

export function useUpdateSalesManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SalesManagerUpdate }) => api.updateSalesManager(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales_managers'] }),
  });
}

export function useDeleteSalesManager() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSalesManager(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales_managers'] }),
  });
}
