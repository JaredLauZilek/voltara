import type { Database } from '@/shared/lib/database.types';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export const PRODUCT_CATEGORIES = ['Charger Units', 'Electrical', 'Accessories', 'Cables'] as const;

export function stockStatus(p: Product): 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Service' {
  if (p.is_service) return 'Service';
  if (p.qty == null || p.qty <= 0) return 'Out of Stock';
  if (p.qty < p.reorder_level) return 'Low Stock';
  return 'In Stock';
}

export function margin(p: Product): number {
  if (p.price <= 0) return 0;
  return ((p.price - p.cost) / p.price) * 100;
}
