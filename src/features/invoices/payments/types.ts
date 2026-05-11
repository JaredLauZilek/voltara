import type { Database } from '@/shared/lib/database.types';

export type InvoicePayment = Database['public']['Tables']['invoice_payments']['Row'];
export type InvoicePaymentInsert = Database['public']['Tables']['invoice_payments']['Insert'];
export type InvoicePaymentUpdate = Database['public']['Tables']['invoice_payments']['Update'];

export type PaymentMethod = NonNullable<InvoicePayment['method']>;

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'Credit Card',
  'Cheque',
  'Other',
];
