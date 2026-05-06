import type { Database } from '@/shared/lib/database.types';

export type Post = Database['public']['Tables']['posts']['Row'];
export type PostInsert = Database['public']['Tables']['posts']['Insert'];
export type PostUpdate = Database['public']['Tables']['posts']['Update'];

export const PLATFORMS = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok'] as const;
export const POST_TYPES = [
  'Product Highlight',
  'Installation Story',
  'Promotion',
  'Educational',
  'Testimonial',
  'Company Update',
] as const;
export const POST_STATUSES = ['Scheduled', 'Draft', 'Published', 'Needs Review'] as const;

export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook: '#1877F2',
  LinkedIn: '#0A66C2',
  TikTok: '#000000',
};
