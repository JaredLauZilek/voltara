import { supabase, stripId } from '@/shared/lib/supabase';
import type { InvoicePayment, InvoicePaymentInsert } from './types';

export async function listAllPayments(): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .order('paid_on', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listPaymentsForInvoice(invoiceId: string): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_on', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPayment(row: InvoicePaymentInsert): Promise<InvoicePayment> {
  const { data, error } = await supabase
    .from('invoice_payments')
    .insert(stripId(row))
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await supabase.from('invoice_payments').delete().eq('id', id);
  if (error) throw error;
}
