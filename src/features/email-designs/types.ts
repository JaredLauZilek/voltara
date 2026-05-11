import type { Database } from '@/shared/lib/database.types';
import type { DocType } from '@/features/form-designs';

export type CompanyEmailProfile = Database['public']['Tables']['company_email_profile']['Row'];
export type CompanyEmailProfileUpdate = Database['public']['Tables']['company_email_profile']['Update'];

export type EmailDesign = Database['public']['Tables']['email_designs']['Row'];
export type EmailDesignUpdate = Database['public']['Tables']['email_designs']['Update'];

export type { DocType };

export interface PlaceholderContext {
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    attention_to: string;
  };
  doc: {
    id: string;
    kind: string;          // 'Quotation' | 'Invoice' | …
    date: string;          // formatted issue / valid-from date
    due_date: string;
    valid_to: string;
    total: string;         // pre-formatted with currency prefix
    currency: string;
  };
  company: {
    name: string;
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

export const PLACEHOLDER_TOKENS = [
  '{{customer.name}}',
  '{{customer.email}}',
  '{{customer.attention_to}}',
  '{{doc.id}}',
  '{{doc.kind}}',
  '{{doc.date}}',
  '{{doc.due_date}}',
  '{{doc.valid_to}}',
  '{{doc.total}}',
  '{{company.name}}',
  '{{company.email}}',
  '{{company.phone}}',
  '{{company.website}}',
] as const;
