import type { Database } from '@/shared/lib/database.types';

export type Task = Database['public']['Tables']['tasks']['Row'];
export type TaskInsert = Database['public']['Tables']['tasks']['Insert'];
export type TaskUpdate = Database['public']['Tables']['tasks']['Update'];

export const TASK_PRIORITIES = ['Low', 'Normal', 'High'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const TASK_RELATED_KINDS = [
  'installation',
  'invoice',
  'bill',
  'expense',
  'quote',
  'customer',
  'supplier',
] as const;
export type TaskRelatedKind = typeof TASK_RELATED_KINDS[number];
