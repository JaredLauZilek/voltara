import type { Database } from '@/shared/lib/database.types';

export type SeoKeyword = Database['public']['Tables']['seo_keywords']['Row'];
export type SeoRanking = Database['public']['Tables']['seo_rankings']['Row'];
export type SeoPage = Database['public']['Tables']['seo_pages']['Row'];
export type SeoTraffic = Database['public']['Tables']['seo_traffic_daily']['Row'];
export type SeoBacklink = Database['public']['Tables']['seo_backlinks']['Row'];
export type SeoCompetitor = Database['public']['Tables']['seo_competitors']['Row'];
export type SeoCompetitorRanking = Database['public']['Tables']['seo_competitor_rankings']['Row'];
export type SeoAlert = Database['public']['Tables']['seo_alerts']['Row'];
export type SeoIntegration = Database['public']['Tables']['seo_integrations']['Row'];
export type SeoSummary = Database['public']['Views']['vw_seo_summary']['Row'];
export type SeoTopMover = Database['public']['Views']['vw_seo_top_movers']['Row'];

export type AlertSeverity = SeoAlert['severity'];
export type AlertType = SeoAlert['type'];
export type IntegrationProvider = SeoIntegration['provider'];

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, { bg: string; color: string; border: string }> = {
  high:   { bg: '#FDEAEA', color: '#C0321A', border: '#C0321A' },
  medium: { bg: '#FFF8E1', color: '#B07D00', border: '#B07D00' },
  low:    { bg: '#F3F3F3', color: '#767B77', border: '#767B77' },
};

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  rank_drop:      'Ranking drop',
  crawl_spike:    'Crawl error spike',
  backlinks_lost: 'Backlinks lost',
  indexing_drop:  'Indexing drop',
  penalty:        'Manual action / penalty',
  cwv_regression: 'Core Web Vitals regression',
};

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  gsc:        'Google Search Console',
  ga4:        'Google Analytics 4',
  pagespeed:  'PageSpeed Insights',
  dataforseo: 'DataForSEO',
  ahrefs:     'Ahrefs',
  semrush:    'Semrush',
};

export type SeoTabId =
  | 'rankings'
  | 'traffic'
  | 'technical'
  | 'backlinks'
  | 'onpage'
  | 'competitors'
  | 'alerts';

export const SEO_TABS: { id: SeoTabId; label: string }[] = [
  { id: 'rankings',    label: 'Rankings' },
  { id: 'traffic',     label: 'Traffic' },
  { id: 'technical',   label: 'Technical' },
  { id: 'backlinks',   label: 'Backlinks' },
  { id: 'onpage',      label: 'On-Page' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'alerts',      label: 'Alerts' },
];
