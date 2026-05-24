import type { ReactNode } from 'react';
import type { ScreenId } from './nav';
import { OverviewScreen } from '@/features/overview';
import { TodoScreen } from '@/features/todo';
import { InvoicesScreen } from '@/features/invoices';
import { InstallationsScreen } from '@/features/installations';
import { CustomersScreen } from '@/features/customers';
import { SocialScreen } from '@/features/social';
import { AIBloggerScreen } from '@/features/ai-blogger';
import { SalesScreen } from '@/features/sales';
import { SalesOrdersScreen } from '@/features/sales-orders';
import { SalesManagersScreen } from '@/features/sales-managers';
import { PurchaseOrdersScreen } from '@/features/purchase-orders';
import { BillsScreen } from '@/features/bills';
import { ExpensesScreen } from '@/features/expenses';
import { ProductsScreen } from '@/features/products';
import { SuppliersScreen } from '@/features/suppliers';
import { SEOMonitorScreen } from '@/features/seo';
import { FormDesignsScreen } from '@/features/form-designs';
import { EmailDesignsScreen } from '@/features/email-designs';
import { ExportsScreen } from '@/features/exports';
import { SnapshotsScreen } from '@/features/snapshots';
import { SupabaseHealthScreen } from '@/features/supabase-health';

export const ROUTES: Record<ScreenId, ReactNode> = {
  overview:       <OverviewScreen />,
  todo:           <TodoScreen />,
  invoices:       <InvoicesScreen />,
  installations:  <InstallationsScreen />,
  customers:      <CustomersScreen />,
  social:         <SocialScreen />,
  aiblogger:      <AIBloggerScreen />,
  sales:          <SalesScreen />,
  salesorders:    <SalesOrdersScreen />,
  salesmanagers:  <SalesManagersScreen />,
  purchaseorders: <PurchaseOrdersScreen />,
  bills:          <BillsScreen />,
  expenses:       <ExpensesScreen />,
  products:       <ProductsScreen />,
  suppliers:      <SuppliersScreen />,
  seo:            <SEOMonitorScreen />,
  formdesigns:    <FormDesignsScreen />,
  emaildesigns:   <EmailDesignsScreen />,
  exports:        <ExportsScreen />,
  snapshots:      <SnapshotsScreen />,
  supabasehealth: <SupabaseHealthScreen />,
};
