import type { Database } from '@/shared/lib/database.types';

export type Supplier = Database['public']['Tables']['suppliers']['Row'];
export type SupplierInsert = Database['public']['Tables']['suppliers']['Insert'];
export type SupplierUpdate = Database['public']['Tables']['suppliers']['Update'];

export type SupplierWithStats = Supplier & {
  po_count: number;
  total_spend: number;
};

export const SUPPLIER_STATUSES = ['Active', 'Inactive', 'Prospect'] as const;
export const SUPPLIER_CATEGORIES = [
  'Charger OEM',
  'Electrical Equipment',
  'Electrical Components',
  'Internal',
] as const;
