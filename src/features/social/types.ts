import type { Database } from '@/shared/lib/database.types';
import { C } from '@/shared/tokens';

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

// Third-party platform brand colours — a deliberate exception to the
// no-inline-hex rule (§6), which governs the Voltara palette. These identify
// someone else's brand, so they must not be substituted with C.* tokens.
export const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  Facebook: '#1877F2',
  LinkedIn: '#0A66C2',
  TikTok: C.black,
};
