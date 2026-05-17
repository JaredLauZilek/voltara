import type { Database } from '@/shared/lib/database.types';

export type Expense = Database['public']['Tables']['expenses']['Row'];
export type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
export type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];
export type ExpenseAttachment = Expense['attachments'][number];
export type ExpensePeriod = Expense['periods'][number];

export const RECURRENCE_FREQUENCIES = ['Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const;
export type RecurrenceFrequency = typeof RECURRENCE_FREQUENCIES[number];

// Categories are user-managed via the `expense_categories` lookup table
// (migration 0046). `ExpenseCategory` is just `string` — the picker
// enforces "must exist in the list" at the UI level.
export type ExpenseCategory = string;

export const EXPENSE_STATUSES = ['Pending', 'Paid', 'Cancelled'] as const;
export type ExpenseStatus = typeof EXPENSE_STATUSES[number];

// Same four currencies as bills + POs — KPIs convert non-RM to MYR via the
// static rate table in shared/lib/currency.ts.
export const EXPENSE_CURRENCIES = ['RM', 'CNY', 'SGD', 'USD'] as const;
export type ExpenseCurrency = typeof EXPENSE_CURRENCIES[number];

export const EXPENSE_RECURRENCES = ['None', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'] as const;
export type ExpenseRecurrence = typeof EXPENSE_RECURRENCES[number];

