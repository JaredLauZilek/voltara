// The ONLY file that knows the full list of features.
// Adding a new feature = add an entry here and a matching entry to routes.ts.

export type ScreenId =
  | 'overview'
  | 'invoices'
  | 'installations'
  | 'customers'
  | 'social'
  | 'sales'
  | 'purchaseorders'
  | 'products'
  | 'suppliers'
  | 'seo';

export interface NavEntry {
  id: ScreenId;
  icon: string;
  label: string;
}

export const NAV: NavEntry[] = [
  { id: 'overview',       icon: '⊞', label: 'Overview' },
  { id: 'invoices',       icon: '◈', label: 'Invoices' },
  { id: 'installations',  icon: '◎', label: 'Installations' },
  { id: 'customers',      icon: '◉', label: 'Customers' },
  { id: 'social',         icon: '◫', label: 'Social Media Planner' },
  { id: 'sales',          icon: '◐', label: 'Sales' },
  { id: 'purchaseorders', icon: '◧', label: 'Purchase Orders' },
  { id: 'products',       icon: '▦', label: 'Inventory & Products' },
  { id: 'suppliers',      icon: '◑', label: 'Suppliers' },
  { id: 'seo',            icon: '◇', label: 'SEO Monitor' },
];

export const SCREEN_TITLES: Record<ScreenId, string> = {
  overview:       'Overview',
  invoices:       'Invoices',
  installations:  'Installations',
  customers:      'Customers',
  social:         'Social Media Planner',
  sales:          'Sales',
  purchaseorders: 'Purchase Orders',
  products:       'Inventory & Products',
  suppliers:      'Suppliers',
  seo:            'SEO Monitor',
};
