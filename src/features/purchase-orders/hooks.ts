import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { PurchaseOrderInsert, PurchaseOrderUpdate } from './types';

export function usePurchaseOrders() {
  return useQuery({ queryKey: ['purchase_orders'], queryFn: api.listPurchaseOrders });
}

export function useCreatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: PurchaseOrderInsert) => api.createPurchaseOrder(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  });
}

export function useUpdatePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: PurchaseOrderUpdate }) => api.updatePurchaseOrder(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  });
}

export function useDeletePurchaseOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePurchaseOrder(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['purchase_orders'] }),
  });
}
