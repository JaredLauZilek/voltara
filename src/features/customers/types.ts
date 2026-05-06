import type { Database } from '@/shared/lib/database.types';

export type Customer = Database['public']['Tables']['customers']['Row'];
export type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
export type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

export type CustomerWithStats = Customer & {
  installs: number;
  spend: number;
};

export const CUSTOMER_TYPES = ['Residential', 'Commercial', 'Condo', 'CPO'] as const;
export const CUSTOMER_STATUSES = ['Active', 'Inactive'] as const;
export const LEAD_SOURCES = ['WhatsApp (Google)', 'WhatsApp (Meta)', 'Website Enquiry'] as const;
export type LeadSource = typeof LEAD_SOURCES[number];
