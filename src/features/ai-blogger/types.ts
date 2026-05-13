import type { Database } from '@/shared/lib/database.types';

export type BlogCompetitor       = Database['public']['Tables']['blog_competitors']['Row'];
export type BlogCompetitorInsert = Database['public']['Tables']['blog_competitors']['Insert'];
export type BlogCompetitorUpdate = Database['public']['Tables']['blog_competitors']['Update'];

export type BlogKeyword          = Database['public']['Tables']['blog_keywords']['Row'];
export type BlogKeywordInsert    = Database['public']['Tables']['blog_keywords']['Insert'];

export type BlogDraft            = Database['public']['Tables']['blog_drafts']['Row'];
export type BlogDraftInsert      = Database['public']['Tables']['blog_drafts']['Insert'];
export type BlogDraftUpdate      = Database['public']['Tables']['blog_drafts']['Update'];

export type BlogSeoSnapshot      = Database['public']['Tables']['blog_seo_snapshots']['Row'];

export type AIBloggerConfig      = Database['public']['Tables']['ai_blogger_config']['Row'];
export type AIBloggerConfigUpdate = Database['public']['Tables']['ai_blogger_config']['Update'];

export type DraftStatus = BlogDraft['status'];
export type PostingCadence = AIBloggerConfig['posting_cadence'];

export const DRAFT_STATUSES: DraftStatus[] = ['draft', 'approved', 'scheduled', 'publishing', 'published', 'failed'];
export const POSTING_CADENCES: PostingCadence[] = ['daily', 'weekly', 'biweekly', 'monthly', 'manual'];
