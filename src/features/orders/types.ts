import type { Database } from '@/shared/lib/database.types';

export type Order = Database['public']['Tables']['orders']['Row'];
