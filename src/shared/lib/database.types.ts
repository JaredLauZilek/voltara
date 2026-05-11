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
      supplier_categories: {
        Row: { name: string; kind: 'Supplier' | 'Vendor' | 'Contractor'; created_at: string };
        Insert: { name: string; kind: 'Supplier' | 'Vendor' | 'Contractor'; created_at?: string };
        Update: Partial<{ name: string; kind: 'Supplier' | 'Vendor' | 'Contractor'; created_at: string }>;
      };
      suppliers: {
        Row: {
          id: string;
          name: string;
          category: string;
          kind: 'Supplier' | 'Vendor' | 'Contractor';
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
        Insert: Omit<Database['public']['Tables']['suppliers']['Row'], 'created_at' | 'kind'> & { created_at?: string; kind?: 'Supplier' | 'Vendor' | 'Contractor' };
        Update: Partial<Database['public']['Tables']['suppliers']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: string;
          category: string;
          cost: number;
          price: number;
          qty: number | null;
          reorder_level: number;
          supplier_id: string | null;
          location: string | null;
          is_service: boolean;
          description: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'created_at' | 'is_service'> & { created_at?: string; is_service?: boolean };
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
          product_id: string | null;
          quote_id: string | null;
          tech: string;
          scheduled: string;
          status: 'Pending' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled';
          notes: string | null;
          qty_overrides: Record<string, number>;
        };
        Insert: Omit<Database['public']['Tables']['installations']['Row'], 'product_id' | 'quote_id' | 'notes' | 'qty_overrides'> & {
          product_id?: string | null;
          quote_id?: string | null;
          notes?: string | null;
          qty_overrides?: Record<string, number>;
        };
        Update: Partial<Database['public']['Tables']['installations']['Insert']>;
      };
      invoices: {
        Row: {
          id: string;
          customer_id: string;
          quote_id: string | null;
          line_items: LineItem[];
          discount: number;
          tax: number;
          notes: string | null;
          status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
          issue_date: string;
          due_date: string;
          stock_deducted: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'created_at' | 'stock_deducted'> & { created_at?: string; stock_deducted?: boolean };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
      };
      quotes: {
        Row: {
          id: string;
          type: 'Quotation' | 'Proposal';
          customer_id: string;
          sales_manager_id: string | null;
          line_items: LineItem[];
          discount: number;
          notes: string | null;
          status: 'Draft' | 'Sent' | 'Case Won' | 'Case Lost' | 'Expired';
          valid_from: string;
          valid_to: string;
          stock_deducted: boolean;
          won_at: string | null;
          last_followup_date: string | null;
          customer_po_attachments: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          proposal_attachments: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          remarks: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['quotes']['Row'], 'created_at' | 'stock_deducted' | 'won_at' | 'last_followup_date' | 'customer_po_attachments' | 'proposal_attachments' | 'remarks'> & { created_at?: string; stock_deducted?: boolean; won_at?: string | null; last_followup_date?: string | null; customer_po_attachments?: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[]; proposal_attachments?: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[]; remarks?: string | null };
        Update: Partial<Database['public']['Tables']['quotes']['Insert']>;
      };
      sales_managers: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          target_revenue: number;
          active: boolean;
          photo_data_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['sales_managers']['Row'], 'created_at' | 'active' | 'photo_data_url'> & { created_at?: string; active?: boolean; photo_data_url?: string | null };
        Update: Partial<Database['public']['Tables']['sales_managers']['Insert']>;
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
          currency: 'RM' | 'CNY' | 'SGD' | 'USD';
          created_date: string;
          delivery_date: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['purchase_orders']['Row'], 'created_at' | 'currency'> & { created_at?: string; currency?: 'RM' | 'CNY' | 'SGD' | 'USD' };
        Update: Partial<Database['public']['Tables']['purchase_orders']['Insert']>;
      };
      expenses: {
        Row: {
          id: string;
          expense_date: string;
          category:
            | 'Rent' | 'Utilities' | 'Salary' | 'Reimbursement' | 'Subscription'
            | 'Office' | 'Travel' | 'Marketing' | 'Insurance' | 'Tax' | 'Maintenance' | 'Other';
          payee: string;
          payee_email: string | null;
          supplier_id: string | null;
          entity: string | null;
          amount: number;
          payment_method: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Cheque' | 'Other' | null;
          reference: string | null;
          recurrence: 'None' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
          status: 'Pending' | 'Paid' | 'Cancelled';
          paid_on: string | null;
          attachments: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          periods: {
            period: string;
            status: 'Pending' | 'Paid' | 'Cancelled';
            paid_on: string | null;
            attachments: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          }[];
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['expenses']['Row'], 'created_at' | 'attachments' | 'recurrence' | 'status' | 'periods'> & {
          created_at?: string;
          attachments?: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          recurrence?: 'None' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
          status?: 'Pending' | 'Paid' | 'Cancelled';
          periods?: {
            period: string;
            status: 'Pending' | 'Paid' | 'Cancelled';
            paid_on: string | null;
            attachments: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          }[];
        };
        Update: Partial<Database['public']['Tables']['expenses']['Insert']>;
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
      company_profile: {
        Row: {
          id: string;
          company_name: string;
          address: string | null;
          registration_no: string | null;
          tax_id: string | null;
          phone: string | null;
          email: string | null;
          website: string | null;
          bank_details: string | null;
          logo_data_url: string | null;
          brand_color: string;
          font_family: 'Figtree' | 'Helvetica' | 'Times' | 'Courier';
          paper_size: 'A4' | 'Letter';
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['company_profile']['Row'], 'updated_at' | 'id' | 'company_name' | 'brand_color' | 'font_family' | 'paper_size'> & {
          id?: string;
          company_name?: string;
          brand_color?: string;
          font_family?: 'Figtree' | 'Helvetica' | 'Times' | 'Courier';
          paper_size?: 'A4' | 'Letter';
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['company_profile']['Insert']>;
      };
      form_designs: {
        Row: {
          doc_type: 'invoice' | 'quote' | 'delivery_order' | 'purchase_order';
          accent_color: string | null;
          header_note: string | null;
          footer_text: string | null;
          terms_text: string | null;
          payment_instructions: string | null;
          show_logo: boolean;
          show_company_address: boolean;
          show_customer_address: boolean;
          show_notes: boolean;
          show_signature_block: boolean;
          column_visibility: {
            sku: boolean;
            description: boolean;
            qty: boolean;
            unit_price: boolean;
            tax: boolean;
            line_total: boolean;
          };
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['form_designs']['Row'], 'updated_at' | 'show_logo' | 'show_company_address' | 'show_customer_address' | 'show_notes' | 'show_signature_block' | 'column_visibility'> & {
          show_logo?: boolean;
          show_company_address?: boolean;
          show_customer_address?: boolean;
          show_notes?: boolean;
          show_signature_block?: boolean;
          column_visibility?: Database['public']['Tables']['form_designs']['Row']['column_visibility'];
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['form_designs']['Insert']>;
      };
      company_email_profile: {
        Row: {
          id: string;
          default_from_name: string;
          default_from_address: string;
          default_reply_to: string | null;
          default_cc: string | null;
          default_bcc: string | null;
          default_signature: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['company_email_profile']['Row'], 'updated_at' | 'id' | 'default_from_name' | 'default_from_address'> & {
          id?: string;
          default_from_name?: string;
          default_from_address?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['company_email_profile']['Insert']>;
      };
      email_designs: {
        Row: {
          doc_type: 'invoice' | 'quote' | 'delivery_order' | 'purchase_order';
          from_name: string | null;
          from_address: string | null;
          reply_to: string | null;
          cc: string | null;
          bcc: string | null;
          subject_template: string;
          intro_text: string | null;
          body_text: string | null;
          signature_text: string | null;
          footer_text: string | null;
          accent_color: string | null;
          attach_pdf: boolean;
          show_logo: boolean;
          show_doc_summary: boolean;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['email_designs']['Row'], 'updated_at' | 'subject_template' | 'attach_pdf' | 'show_logo' | 'show_doc_summary'> & {
          subject_template?: string;
          attach_pdf?: boolean;
          show_logo?: boolean;
          show_doc_summary?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['email_designs']['Insert']>;
      };
      bills: {
        Row: {
          id: string;
          bill_date: string;
          due_date: string | null;
          category: 'Materials' | 'Installation' | 'Labour' | 'Equipment' | 'Transport' | 'Subcontractor' | 'Professional Fees' | 'Utilities' | 'Maintenance' | 'Other';
          vendor: string;
          vendor_email: string | null;
          supplier_id: string | null;
          quote_id: string | null;
          amount: number;
          tax: number;
          payment_method: 'Cash' | 'Bank Transfer' | 'Credit Card' | 'Cheque' | 'Other' | null;
          reference: string | null;
          status: 'Unpaid' | 'Paid' | 'Overdue' | 'Disputed';
          paid_on: string | null;
          attachments: { name: string; mime: string; storage_path: string; size: number; uploaded_at: string }[];
          notes: string | null;
          currency: 'RM' | 'CNY' | 'SGD' | 'USD';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bills']['Row'], 'created_at' | 'tax' | 'status' | 'currency'> & { created_at?: string; tax?: number; status?: 'Unpaid' | 'Paid' | 'Overdue' | 'Disputed'; currency?: 'RM' | 'CNY' | 'SGD' | 'USD' };
        Update: Partial<Database['public']['Tables']['bills']['Insert']>;
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
