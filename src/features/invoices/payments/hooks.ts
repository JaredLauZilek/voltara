import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { InvoicePaymentInsert } from './types';

export function useAllInvoicePayments() {
  return useQuery({ queryKey: ['invoice_payments', 'all'], queryFn: api.listAllPayments });
}

export function useInvoicePayments(invoiceId: string | null | undefined) {
  return useQuery({
    queryKey: ['invoice_payments', invoiceId],
    queryFn: () => api.listPaymentsForInvoice(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (row: InvoicePaymentInsert) => api.createPayment(row),
    onSuccess: () => {
      // Invalidate every invoice_payments key (per-invoice + 'all') in one shot.
      qc.invalidateQueries({ queryKey: ['invoice_payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useDeletePayment(_invoiceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePayment(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoice_payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}
