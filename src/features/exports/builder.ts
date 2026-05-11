import { createElement } from 'react';
import JSZip from 'jszip';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/shared/lib/supabase';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Customer } from '@/features/customers';
import type { Supplier } from '@/features/suppliers';
import type { Product } from '@/features/products';
import type { Invoice } from '@/features/invoices';
import type { Bill } from '@/features/bills';
import type { Expense } from '@/features/expenses';
import type { PurchaseOrder } from '@/features/purchase-orders';
import type { Quote } from '@/features/sales';
import { calcInvoiceTotals } from '@/features/invoices';
import { calcPOTotal } from '@/features/purchase-orders';
import { calcQuoteTotal } from '@/features/sales';
import { InvoicePdf } from '@/features/invoices/pdf/InvoicePdf';
import { POPdf } from '@/features/purchase-orders/pdf/POPdf';
import { toCSV } from './csv';
import { inPeriod, type Period } from './period';

export interface ExportInputs {
  period: Period;
  invoices: Invoice[];
  bills: Bill[];
  expenses: Expense[];
  pos: PurchaseOrder[];
  quotes: Quote[];
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  invoiceProfile: CompanyProfile;
  invoiceDesign: FormDesign;
  poProfile: CompanyProfile;
  poDesign: FormDesign;
}

export interface BuildProgress {
  /** "Building invoices.csv", "Rendering INV-001.pdf", etc */
  message: string;
  /** 0..1 fraction of total work completed. */
  fraction: number;
}

type ProgressFn = (p: BuildProgress) => void;

const BUCKET = 'attachments';

async function fetchAttachmentBlob(storagePath: string): Promise<Blob | null> {
  // Use download() rather than getPublicUrl so we work with private buckets too.
  const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
  if (error || !data) return null;
  return data;
}

function safeFile(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120);
}

function deriveExtFromMime(mime: string): string {
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  return 'bin';
}

export async function buildExportZip(inputs: ExportInputs, onProgress: ProgressFn): Promise<Blob> {
  const { period } = inputs;
  const customerById = new Map(inputs.customers.map((c) => [c.id, c]));
  const supplierById = new Map(inputs.suppliers.map((s) => [s.id, s]));

  // ── Filter to period ─────────────────────────────────────────────────────
  const periodInvoices = inputs.invoices.filter((i) => inPeriod(i.issue_date, period));
  const periodBills    = inputs.bills.filter((b) => inPeriod(b.bill_date, period));
  const periodExpenses = inputs.expenses.filter((e) => inPeriod(e.expense_date, period));
  const periodPOs      = inputs.pos.filter((p) => inPeriod(p.created_date, period));
  const periodQuotes   = inputs.quotes.filter((q) => inPeriod(q.valid_from, period));

  // Outstanding receivables/payables are NOT period-filtered — the accountant
  // wants the current open ledger regardless of when the doc was issued.
  const openInvoices = inputs.invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue');
  const openBills    = inputs.bills.filter((b) => b.status === 'Unpaid' || b.status === 'Overdue');

  const zip = new JSZip();

  // ── Estimate work for progress reporting ─────────────────────────────────
  const totalAttachmentDownloads =
    periodBills.reduce((n, b) => n + (b.attachments?.length ?? 0), 0) +
    periodExpenses.reduce((n, e) => n + (e.attachments?.length ?? 0), 0);
  const totalPdfRenders = periodInvoices.length + periodPOs.length;
  const totalSteps = Math.max(1, totalPdfRenders + totalAttachmentDownloads + 6); // +6 for csv + readme bookkeeping
  let stepsDone = 0;
  const tick = (message: string) => {
    stepsDone += 1;
    onProgress({ message, fraction: Math.min(1, stepsDone / totalSteps) });
  };

  // ── 01-financial-summary ────────────────────────────────────────────────
  onProgress({ message: 'Computing P&L summary…', fraction: stepsDone / totalSteps });

  const revenue = periodInvoices
    .filter((i) => i.status === 'Paid')
    .reduce((s, i) => s + calcInvoiceTotals(i.line_items, i.discount, i.tax).total, 0);
  const cogs = periodBills
    .filter((b) => b.status === 'Paid')
    .reduce((s, b) => s + b.amount + b.tax, 0);
  const opex = periodExpenses
    .filter((e) => e.status === 'Paid')
    .reduce((s, e) => s + e.amount, 0);
  const gross = revenue - cogs;
  const net = gross - opex;

  zip.file(
    '01-financial-summary/pnl-summary.csv',
    toCSV(
      ['metric', 'amount_rm'],
      [
        ['Revenue (paid invoices)', revenue.toFixed(2)],
        ['COGS (paid bills, RM-equivalent)', cogs.toFixed(2)],
        ['Gross Profit', gross.toFixed(2)],
        ['Operating Expenses (paid)', opex.toFixed(2)],
        ['Net Profit', net.toFixed(2)],
      ]
    )
  );

  zip.file(
    '01-financial-summary/period-totals.csv',
    toCSV(
      ['entity', 'status', 'count', 'total_rm'],
      [
        ...statusBuckets(periodInvoices, (i) => i.status, (i) => calcInvoiceTotals(i.line_items, i.discount, i.tax).total)
          .map(({ status, count, total }) => ['invoices', status, count, total.toFixed(2)] as const),
        ...statusBuckets(periodBills, (b) => b.status, (b) => b.amount + b.tax)
          .map(({ status, count, total }) => ['bills', status, count, total.toFixed(2)] as const),
        ...statusBuckets(periodExpenses, (e) => e.status, (e) => e.amount)
          .map(({ status, count, total }) => ['expenses', status, count, total.toFixed(2)] as const),
        ...statusBuckets(periodPOs, (p) => p.status, (p) => calcPOTotal(p.line_items, p.discount))
          .map(({ status, count, total }) => ['purchase_orders', status, count, total.toFixed(2)] as const),
      ].map((r) => [...r])
    )
  );

  zip.file(
    '01-financial-summary/ar-ap-summary.csv',
    toCSV(
      ['ledger', 'doc_id', 'party', 'amount_rm', 'currency', 'issued', 'due', 'status', 'age_days'],
      [
        ...openInvoices.map((i) => {
          const total = calcInvoiceTotals(i.line_items, i.discount, i.tax).total;
          const age = ageDays(i.due_date);
          return [
            'AR',
            i.id,
            customerById.get(i.customer_id)?.name ?? i.customer_id,
            total.toFixed(2),
            'RM',
            i.issue_date,
            i.due_date,
            i.status,
            age,
          ];
        }),
        ...openBills.map((b) => {
          const age = ageDays(b.due_date);
          return [
            'AP',
            b.id,
            supplierById.get(b.supplier_id ?? '')?.name ?? b.vendor,
            (b.amount + b.tax).toFixed(2),
            b.currency ?? 'RM',
            b.bill_date,
            b.due_date ?? '',
            b.status,
            age,
          ];
        }),
      ]
    )
  );
  tick('Wrote financial summary');

  // ── 02-revenue ──────────────────────────────────────────────────────────
  zip.file(
    '02-revenue/invoices.csv',
    toCSV(
      ['id', 'customer_id', 'customer_name', 'quote_id', 'issue_date', 'due_date', 'status',
       'subtotal_rm', 'discount_pct', 'discount_amt_rm', 'tax_pct', 'tax_amt_rm', 'total_rm', 'notes'],
      periodInvoices.map((i) => {
        const t = calcInvoiceTotals(i.line_items, i.discount, i.tax);
        return [
          i.id,
          i.customer_id,
          customerById.get(i.customer_id)?.name ?? '',
          i.quote_id ?? '',
          i.issue_date,
          i.due_date,
          i.status,
          t.subtotal.toFixed(2),
          i.discount,
          t.discountAmt.toFixed(2),
          i.tax,
          t.taxAmt.toFixed(2),
          t.total.toFixed(2),
          i.notes ?? '',
        ];
      })
    )
  );

  // Sales orders cross-ref: feature is scaffold-only; ship an empty placeholder
  // CSV so the structure matches the accountant's expected layout.
  zip.file(
    '02-revenue/sales-orders.csv',
    toCSV(['id', 'customer_id', 'status', 'created_date', 'total_rm'], [])
  );

  // Render invoice PDFs
  for (const inv of periodInvoices) {
    onProgress({ message: `Rendering INV ${inv.id}…`, fraction: stepsDone / totalSteps });
    const customer = customerById.get(inv.customer_id) ?? null;
    const blob = await pdf(
      createElement(InvoicePdf, {
        invoice: inv,
        customer,
        products: inputs.products,
        profile: inputs.invoiceProfile,
        design: inputs.invoiceDesign,
      })
    ).toBlob();
    zip.file(`02-revenue/pdfs/${safeFile(inv.id)}.pdf`, blob);
    tick(`Rendered ${inv.id}`);
  }

  // ── 03-cogs ─────────────────────────────────────────────────────────────
  zip.file(
    '03-cogs/bills.csv',
    toCSV(
      ['id', 'bill_date', 'due_date', 'category', 'vendor', 'supplier_id',
       'quote_id', 'currency', 'amount', 'tax', 'total', 'payment_method',
       'reference', 'status', 'paid_on', 'notes'],
      periodBills.map((b) => [
        b.id, b.bill_date, b.due_date ?? '', b.category, b.vendor, b.supplier_id ?? '',
        b.quote_id ?? '', b.currency ?? 'RM', b.amount.toFixed(2), b.tax.toFixed(2),
        (b.amount + b.tax).toFixed(2), b.payment_method ?? '', b.reference ?? '',
        b.status, b.paid_on ?? '', b.notes ?? '',
      ])
    )
  );

  zip.file(
    '03-cogs/purchase-orders.csv',
    toCSV(
      ['id', 'supplier_id', 'supplier_name', 'status', 'currency',
       'subtotal', 'discount_pct', 'total', 'created_date'],
      periodPOs.map((p) => {
        const subtotal = p.line_items.reduce((s, li) => s + li.qty * li.unit_price_snapshot, 0);
        return [
          p.id,
          p.supplier_id ?? '',
          supplierById.get(p.supplier_id ?? '')?.name ?? '',
          p.status,
          p.currency ?? 'RM',
          subtotal.toFixed(2),
          p.discount,
          calcPOTotal(p.line_items, p.discount).toFixed(2),
          p.created_date,
        ];
      })
    )
  );

  // Bill attachments
  for (const b of periodBills) {
    for (const att of b.attachments ?? []) {
      onProgress({ message: `Downloading ${b.id} / ${att.name}…`, fraction: stepsDone / totalSteps });
      const blob = await fetchAttachmentBlob(att.storage_path);
      if (!blob) { tick(`Skipped ${att.name}`); continue; }
      const ext = deriveExtFromMime(att.mime);
      zip.file(`03-cogs/bill-attachments/${safeFile(b.id)}-${safeFile(att.name) || 'file'}.${ext}`, blob);
      tick(`Saved ${att.name}`);
    }
  }

  // PO PDFs
  for (const po of periodPOs) {
    onProgress({ message: `Rendering PO ${po.id}…`, fraction: stepsDone / totalSteps });
    const supplier = supplierById.get(po.supplier_id ?? '') ?? null;
    const blob = await pdf(
      createElement(POPdf, {
        po,
        supplier,
        products: inputs.products,
        profile: inputs.poProfile,
        design: inputs.poDesign,
      })
    ).toBlob();
    zip.file(`03-cogs/po-pdfs/${safeFile(po.id)}.pdf`, blob);
    tick(`Rendered ${po.id}`);
  }

  // ── 04-expenses ─────────────────────────────────────────────────────────
  zip.file(
    '04-expenses/expenses.csv',
    toCSV(
      ['id', 'expense_date', 'category', 'payee', 'supplier_id', 'entity', 'amount',
       'payment_method', 'reference', 'recurrence', 'status', 'paid_on', 'notes'],
      periodExpenses.map((e) => [
        e.id, e.expense_date, e.category, e.payee, e.supplier_id ?? '', e.entity ?? '',
        e.amount.toFixed(2), e.payment_method ?? '', e.reference ?? '', e.recurrence,
        e.status, e.paid_on ?? '', e.notes ?? '',
      ])
    )
  );

  for (const e of periodExpenses) {
    for (const att of e.attachments ?? []) {
      onProgress({ message: `Downloading ${e.id} / ${att.name}…`, fraction: stepsDone / totalSteps });
      const blob = await fetchAttachmentBlob(att.storage_path);
      if (!blob) { tick(`Skipped ${att.name}`); continue; }
      const ext = deriveExtFromMime(att.mime);
      zip.file(`04-expenses/attachments/${safeFile(e.id)}-${safeFile(att.name) || 'file'}.${ext}`, blob);
      tick(`Saved ${att.name}`);
    }
  }

  // ── 05-master-data ──────────────────────────────────────────────────────
  zip.file(
    '05-master-data/customers.csv',
    toCSV(
      ['id', 'name', 'type', 'email', 'phone', 'address', 'attention_to'],
      inputs.customers.map((c) => [c.id, c.name, c.type, c.email ?? '', c.phone ?? '', c.address ?? '', c.attention_to ?? ''])
    )
  );

  zip.file(
    '05-master-data/suppliers-vendors.csv',
    toCSV(
      ['id', 'name', 'kind', 'category', 'status', 'contact', 'email', 'phone', 'address', 'payment_terms', 'reg_number'],
      inputs.suppliers.map((s) => [
        s.id, s.name, s.kind ?? 'Supplier', s.category, s.status, s.contact ?? '',
        s.email ?? '', s.phone ?? '', s.address ?? '', s.payment_terms ?? '', s.reg_number ?? '',
      ])
    )
  );

  zip.file(
    '05-master-data/products.csv',
    toCSV(
      ['id', 'name', 'category', 'cost_rm', 'price_rm'],
      inputs.products.map((p) => [p.id, p.name, p.category, p.cost.toFixed(2), p.price.toFixed(2)])
    )
  );
  tick('Wrote master data');

  // ── 06-sales-pipeline ───────────────────────────────────────────────────
  zip.file(
    '06-sales-pipeline/quotations.csv',
    toCSV(
      ['id', 'type', 'customer_id', 'customer_name', 'sales_manager_id', 'status',
       'valid_from', 'valid_to', 'total_rm'],
      periodQuotes.map((q) => [
        q.id, q.type, q.customer_id, customerById.get(q.customer_id)?.name ?? '',
        q.sales_manager_id ?? '', q.status, q.valid_from, q.valid_to,
        calcQuoteTotal(q.line_items, q.discount).toFixed(2),
      ])
    )
  );
  zip.file('06-sales-pipeline/sales-orders.csv', toCSV(['id', 'status', 'created_date'], []));
  tick('Wrote sales pipeline');

  // ── README ──────────────────────────────────────────────────────────────
  const readme = [
    `Voltara — Quarterly Export (${period.label})`,
    `Period: ${period.startISO} → ${period.endISO}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    'Folder layout:',
    '  01-financial-summary/   P&L, period totals, AR/AP open ledger',
    '  02-revenue/             Invoices CSV + rendered PDFs',
    '  03-cogs/                Bills CSV + supplier-side documents + PO cross-ref',
    '  04-expenses/            Operating expenses CSV + attachments',
    '  05-master-data/         Customers / Suppliers / Products lookup tables',
    '  06-sales-pipeline/      Optional — quotations and sales orders for context',
    '',
    'All CSVs are UTF-8 with a BOM and use comma separators (RFC 4180).',
    'Money columns are in the entity\'s recorded currency unless noted "_rm".',
    '',
    'Note: Multi-currency entities (POs, Bills) include a "currency" column.',
    'The P&L summary aggregates across all currencies as if RM — convert if',
    'mixed currencies are present.',
  ].join('\r\n');
  zip.file('README.txt', readme);
  tick('Wrote README');

  onProgress({ message: 'Compressing archive…', fraction: 0.99 });
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  onProgress({ message: 'Done', fraction: 1 });
  return blob;
}

function statusBuckets<T, S extends string>(
  rows: T[],
  statusOf: (t: T) => S,
  amountOf: (t: T) => number,
): { status: S; count: number; total: number }[] {
  const map = new Map<S, { count: number; total: number }>();
  for (const r of rows) {
    const s = statusOf(r);
    const cur = map.get(s) ?? { count: 0, total: 0 };
    cur.count += 1;
    cur.total += amountOf(r);
    map.set(s, cur);
  }
  return [...map.entries()].map(([status, v]) => ({ status, ...v }));
}

function ageDays(dueIso: string | null): number | '' {
  if (!dueIso) return '';
  const days = Math.floor((Date.now() - new Date(dueIso).getTime()) / 86_400_000);
  return days;
}
