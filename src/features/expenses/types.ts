import type { Database } from '@/shared/lib/database.types';

export type Expense = Database['public']['Tables']['expenses']['Row'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
export type ExpenseAttachment = Expense['attachments'][number];
export type ExpensePeriod = Expense['periods'][number];

export const RECURRENCE_FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const;
export type RecurrenceFrequency = typeof RECURRENCE_FREQUENCIES[number];

export const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salary', 'Reimbursement', 'Subscription',
  'Office', 'Travel', 'Marketing', 'Insurance', 'Tax', 'Maintenance', 'Other',
] as const;
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];

export const EXPENSE_STATUSES = ['Pending', 'Paid', 'Cancelled'] as const;
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];

export const EXPENSE_RECURRENCES = ['None', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const;
export type ExpenseRecurrence = typeof EXPENSE_RECURRENCES[number];

export const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Credit Card', 'Cheque', 'Other'] as const;
export type PaymentMethod = typeof PAYMENT_METHODS[number];

// Categories where the payee is typically an internal employee (shows the email field)
export const EMPLOYEE_CATEGORIES: ExpenseCategory[] = ['Salary', 'Reimbursement'];
