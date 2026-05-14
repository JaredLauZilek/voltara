import type { Database } from '@/shared/lib/database.types';

export type Bill = Database['public']['Tables']['bills']['Row'];
export type BillInsert = Database['public']['Tables']['bills']['Insert'];
export type BillUpdate = Database['public']['Tables']['bills']['Update'];

export const BILL_STATUSES = ['Unpaid', 'Paid', 'Overdue', 'Disputed'] as const;
export type BillStatus = typeof BILL_STATUSES[number];

export const BILL_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'] as const;
export type BillPaymentMethod = typeof BILL_PAYMENT_METHODS[number];

export const BILL_CURRENCIES = ['RM', 'CNY', 'SGD', 'USD'] as const;
export type BillCurrency = typeof BILL_CURRENCIES[number];

export function calcBillTotal(amount: number, tax: number): number {
  return amount + tax;
}
