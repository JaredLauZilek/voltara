import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { CustomerInsert, CustomerUpdate } from './types';

const KEY = ['customers'] as const;
const KEY_STATS = ['customers', 'with-stats'] as const;

export function useCustomers() {
  return useQuery({ queryKey: KEY, queryFn: api.listCustomers });
}

export function useCustomersWithStats() {
  return useQuery({ queryKey: KEY_STATS, queryFn: api.listCustomersWithStats });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: CustomerInsert) => api.createCustomer(row),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CustomerUpdate }) => api.updateCustomer(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useDeleteCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
