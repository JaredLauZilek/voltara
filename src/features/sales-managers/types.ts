import type { Database } from '@/shared/lib/database.types';

export type SalesManager = Database['public']['Tables']['sales_managers']['Row'];
export type SalesManagerInsert = Database['public']['Tables']['sales_managers']['Insert'];
export type SalesManagerUpdate = Database['public']['Tables']['sales_managers']['Update'];
