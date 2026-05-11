// The ONLY file that knows the full list of features.
// Adding a new feature = add an entry here and a matching entry to routes.ts.

export type ScreenId =
  | 'overview'
  | 'invoices'
  | 'installations'
  | 'customers'
  | 'social'
  | 'sales'
  | 'salesorders'
  | 'salesmanagers'
  | 'purchaseorders'
  | 'bills'
  | 'expenses'
  | 'products'
  | 'suppliers'
  | 'seo'
  | 'formdesigns'
  | 'emaildesigns'
  | 'exports'
  | 'supabasehealth';

export interface NavEntry {
  id: ScreenId;
  icon: string;
  label: string;
}

export interface NavSection {
  label: string | null; // null = no header (top-level entries)
  items: NavEntry[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: null,
    items: [
      { id: 'overview', icon: '⊞', label: 'Overview' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'installations', icon: '◎', label: 'Installations' },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { id: 'purchaseorders', icon: '◧', label: 'Purchase Orders' },
      { id: 'invoices',       icon: '◈', label: 'Invoices' },
      { id: 'bills',          icon: '⊞', label: 'Bills (COGS)' },
      { id: 'expenses',       icon: '⊟', label: 'Expenses' },
    ],
  },
  {
    label: 'Sales & CRM',
    items: [
      { id: 'customers',     icon: '◉', label: 'Customers' },
      { id: 'sales',         icon: '◐', label: 'Sales' },
      { id: 'salesorders',   icon: '◔', label: 'Sales Orders' },
      { id: 'salesmanagers', icon: '◈', label: 'Sales Managers' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { id: 'products',  icon: '▦', label: 'Inventory & Products' },
      { id: 'suppliers', icon: '◑', label: 'Suppliers & Vendors' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { id: 'social', icon: '◫', label: 'Social Media Planner' },
      { id: 'seo',    icon: '◇', label: 'SEO Monitor' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'formdesigns',    icon: '◨', label: 'Form Designs' },
      { id: 'emaildesigns',   icon: '✉', label: 'Email Designs' },
      { id: 'exports',        icon: '⤓', label: 'Exports' },
      { id: 'supabasehealth', icon: '◈', label: 'System Health' },
    ],
  },
];

export const SCREEN_TITLES: Record<ScreenId, string> = {
  overview:       'Overview',
  invoices:       'Invoices',
  installations:  'Installations',
  customers:      'Customers',
  social:         'Social Media Planner',
  sales:          'Sales',
  salesorders:    'Sales Orders',
  salesmanagers:  'Sales Managers',
  purchaseorders: 'Purchase Orders',
  bills:          'Bills (COGS)',
  expenses:       'Expenses',
  products:       'Inventory & Products',
  suppliers:      'Suppliers & Vendors',
  seo:            'SEO Monitor',
  formdesigns:    'Form Designs',
  emaildesigns:   'Email Designs',
  exports:        'Exports',
  supabasehealth: 'System Health',
};
