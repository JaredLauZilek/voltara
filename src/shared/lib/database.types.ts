// Database types — hand-written stub. Replace with generated output:
//   npm run gen:types
// once you've created your Supabase project and applied the migrations.

import type { LineItem } from '@/shared/types';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          type: 'Residential' | 'Commercial' | 'Condo' | 'CPO';
          status: 'Active' | 'Inactive';
          joined: string | null;
          attention_to: string | null;
          lead_source: 'WhatsApp (Google)' | 'WhatsApp (Meta)' | 'Website Enquiry' | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['customers']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['customers']['Insert']>;
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          category: string;
          status: 'Active' | 'Inactive' | 'Prospect';
          contact: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          payment_terms: string | null;
          lead_time_days: number | null;
          reg_number: string | null;
          rating: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          cost: number;
          price: number;
          qty: number;
          reorder_level: number;
          supplier_id: string | null;
          location: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          amount: number;
          status: string;
          date: string;
        };
        Insert: Database['public']['Tables']['orders']['Row'];
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      installations: {
        Row: {
          id: string;
          customer_id: string;
          product_id: string;
          tech: string;
          scheduled: string;
          status: string;
        };
        Insert: Database['public']['Tables']['installations']['Row'];
        Update: Partial<Database['public']['Tables']['installations']['Row']>;
      };
      invoices: {
        Row: {
          id: string;
          customer_id: string;
          line_items: LineItem[];
          discount: number;
          tax: number;
          notes: string | null;
          status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
          issue_date: string;
          due_date: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      quotes: {
        Row: {
          id: string;
          type: 'Quotation' | 'Proposal';
          customer_id: string;
          line_items: LineItem[];
          discount: number;
          notes: string | null;
          status: 'Draft' | 'Sent' | 'Viewed' | 'Accepted' | 'Declined' | 'Expired';
          valid_from: string;
          valid_to: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>;
      };
      purchase_orders: {
        Row: {
          id: string;
          direction: 'outgoing' | 'incoming';
          supplier_id: string | null;
          customer_id: string | null;
          line_items: LineItem[];
          discount: number;
          notes: string | null;
          external_ref: string | null;
          status: 'Draft' | 'Submitted' | 'Approved' | 'Received' | 'Partial' | 'Cancelled';
          created_date: string;
          delivery_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['purchase_orders']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
      };
      posts: {
        Row: {
          id: string;
          platform: string;
          title: string;
          caption: string | null;
          type: string;
          status: 'Scheduled' | 'Draft' | 'Published' | 'Needs Review';
          scheduled_at: string;
          media_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['posts']['Insert']>;
      };
      seo_keywords: {
        Row: {
          id: string;
          keyword: string;
          country: string;
          device: 'desktop' | 'mobile';
          target_url: string | null;
          is_top: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_keywords']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['seo_keywords']['Insert']>;
      };
      seo_rankings: {
        Row: {
          id: number;
          keyword_id: string;
          source: 'google' | 'bing';
          position: number | null;
          serp_features: Json | null;
          captured_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_rankings']['Row'], 'id' | 'captured_at'> & { id?: number; captured_at?: string };
        Update: Partial<Database['public']['Tables']['seo_rankings']['Insert']>;
      };
      seo_pages: {
        Row: {
          url: string;
          indexed: boolean | null;
          status_code: number | null;
          title: string | null;
          meta_description: string | null;
          canonical: string | null;
          lcp_ms: number | null;
          cls: number | null;
          inp_ms: number | null;
          mobile_friendly: boolean | null;
          last_crawled_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_pages']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['seo_pages']['Insert']>;
      };
      seo_traffic_daily: {
        Row: {
          id: number;
          page: string;
          query: string | null;
          clicks: number;
          impressions: number;
          ctr: number | null;
          position: number | null;
          captured_date: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_traffic_daily']['Row'], 'id'> & { id?: number };
        Update: Partial<Database['public']['Tables']['seo_traffic_daily']['Insert']>;
      };
      seo_backlinks: {
        Row: {
          id: string;
          source_url: string;
          target_url: string;
          anchor: string | null;
          domain_authority: number | null;
          first_seen: string | null;
          last_seen: string | null;
          status: 'active' | 'lost' | 'toxic';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_backlinks']['Row'], 'created_at'> & { created_at?: string };
        Update: Partial<Database['public']['Tables']['seo_backlinks']['Insert']>;
      };
      seo_competitors: {
        Row: {
          id: string;
          domain: string;
          label: string | null;
          added_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_competitors']['Row'], 'added_at'> & { added_at?: string };
        Update: Partial<Database['public']['Tables']['seo_competitors']['Insert']>;
      };
      seo_competitor_rankings: {
        Row: {
          id: number;
          keyword_id: string;
          competitor_id: string;
          position: number | null;
          captured_at: string;
        };
        Insert: Omit<Database['public']['Tables']['seo_competitor_rankings']['Row'], 'id' | 'captured_at'> & { id?: number; captured_at?: string };
        Update: Partial<Database['public']['Tables']['seo_competitor_rankings']['Insert']>;
      };
      seo_alerts: {
        Row: {
          id: number;
          severity: 'low' | 'medium' | 'high';
          type: 'rank_drop' | 'crawl_spike' | 'backlinks_lost' | 'indexing_drop' | 'penalty' | 'cwv_regression';
          message: string;
          related: Json | null;
          created_at: string;
          acknowledged_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['seo_alerts']['Row'], 'id' | 'created_at'> & { id?: number; created_at?: string };
        Update: Partial<Database['public']['Tables']['seo_alerts']['Insert']>;
      };
      seo_integrations: {
        Row: {
          provider: 'gsc' | 'ga4' | 'pagespeed' | 'dataforseo' | 'ahrefs' | 'semrush';
          status: 'not_connected' | 'connected' | 'error';
          last_sync_at: string | null;
          last_error: string | null;
        };
        Insert: Database['public']['Tables']['seo_integrations']['Row'];
        Update: Partial<Database['public']['Tables']['seo_integrations']['Row']>;
      };
    };
    Views: {
      vw_customer_stats: {
        Row: {
          customer_id: string;
          installs: number;
          spend: number;
        };
      };
      vw_supplier_stats: {
        Row: {
          supplier_id: string;
          po_count: number;
          total_spend: number;
        };
      };
      vw_seo_summary: {
        Row: {
          indexed_pages: number;
          avg_position_28d: number;
          clicks_28d: number;
          open_alerts: number;
        };
      };
      vw_seo_top_movers: {
        Row: {
          keyword_id: string;
          keyword: string;
          latest_pos: number | null;
          prior_pos: number | null;
          delta: number | null;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
