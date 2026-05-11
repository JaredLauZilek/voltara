// The ONLY file that knows the full list of features.
// Adding a new feature = add an entry here and a matching entry to routes.ts.

import {
  LayoutDashboard,
  Wrench,
  ShoppingCart,
  ReceiptText,
  Wallet,
  CreditCard,
  Users,
  TrendingUp,
  ClipboardList,
  UserCog,
  Package,
  Truck,
  Megaphone,
  LineChart,
  LayoutTemplate,
  Mail,
  Download,
  Activity,
  type LucideIcon,
} from 'lucide-react';

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
  icon: LucideIcon;
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
      { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'installations', icon: Wrench, label: 'Installations' },
    ],
  },
  {
    label: 'Accounting',
    items: [
      { id: 'purchaseorders', icon: ShoppingCart,  label: 'Purchase Orders' },
      { id: 'invoices',       icon: ReceiptText,   label: 'Invoices' },
      { id: 'bills',          icon: Wallet,        label: 'Bills (COGS)' },
      { id: 'expenses',       icon: CreditCard,    label: 'Expenses' },
    ],
  },
  {
    label: 'Sales & CRM',
    items: [
      { id: 'customers',     icon: Users,          label: 'Customers' },
      { id: 'sales',         icon: TrendingUp,     label: 'Sales' },
      { id: 'salesorders',   icon: ClipboardList,  label: 'Sales Orders' },
      { id: 'salesmanagers', icon: UserCog,        label: 'Sales Managers' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { id: 'products',  icon: Package, label: 'Inventory & Products' },
      { id: 'suppliers', icon: Truck,   label: 'Suppliers & Vendors' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { id: 'social', icon: Megaphone, label: 'Social Media Planner' },
      { id: 'seo',    icon: LineChart, label: 'SEO Monitor' },
    ],
  },
  {
    label: 'Settings',
    items: [
      { id: 'formdesigns',    icon: LayoutTemplate, label: 'Form Designs' },
      { id: 'emaildesigns',   icon: Mail,           label: 'Email Designs' },
      { id: 'exports',        icon: Download,       label: 'Exports' },
      { id: 'supabasehealth', icon: Activity,       label: 'System Health' },
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
