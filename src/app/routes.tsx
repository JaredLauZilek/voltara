import type { ReactNode } from 'react';
import type { ScreenId } from './nav';
import { OverviewScreen } from '@/features/overview';
import { InvoicesScreen } from '@/features/invoices';
import { InstallationsScreen } from '@/features/installations';
import { CustomersScreen } from '@/features/customers';
import { SocialScreen } from '@/features/social';
import { SalesScreen } from '@/features/sales';
import { PurchaseOrdersScreen } from '@/features/purchase-orders';
import { ProductsScreen } from '@/features/products';
import { SuppliersScreen } from '@/features/suppliers';
import { SEOMonitorScreen } from '@/features/seo';

export const ROUTES: Record<ScreenId, ReactNode> = {
  overview:       <OverviewScreen />,
  invoices:       <InvoicesScreen />,
  installations:  <InstallationsScreen />,
  customers:      <CustomersScreen />,
  social:         <SocialScreen />,
  sales:          <SalesScreen />,
  purchaseorders: <PurchaseOrdersScreen />,
  products:       <ProductsScreen />,
  suppliers:      <SuppliersScreen />,
  seo:            <SEOMonitorScreen />,
};
