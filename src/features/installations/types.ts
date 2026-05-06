import type { Database } from '@/shared/lib/database.types';

export type Installation = Database['public']['Tables']['installations']['Row'];
export type InstallationInsert = Database['public']['Tables']['installations']['Insert'];

export const INSTALLATION_STATUSES = ['Pending', 'In Progress', 'Completed', 'Overdue', 'Cancelled'] as const;
