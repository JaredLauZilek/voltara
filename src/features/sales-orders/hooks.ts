import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Attachment } from '@/shared/types';
import * as api from './api';
import type { SalesOrderInsert, SalesOrderUpdate } from './types';

export function useSalesOrders() {
  return useQuery({ queryKey: ['sales_orders'], queryFn: api.listSalesOrders });
}

export function useCreateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: SalesOrderInsert) => api.createSalesOrder(row),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales_orders'] }),
  });
}

export function useUpdateSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SalesOrderUpdate }) => api.updateSalesOrder(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales_orders'] }),
  });
}

export function useDeleteSalesOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, attachments }: { id: string; attachments: Attachment[] }) => api.deleteSalesOrder(id, attachments),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales_orders'] }),
  });
}
