import { createElement } from 'react';
import JSZip from 'jszip';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/shared/lib/supabase';
import type { CompanyProfile, FormDesign } from '@/features/form-designs';
import type { Customer } from '@/features/customers';
import type { Supplier } from '@/features/suppliers';
import type { Product } from '@/features/products';
import type { Invoice } from '@/features/invoices';
import type { InvoicePayment } from '@/features/invoices/payments/types';
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
import { toMYRSnapshot } from '@/shared/lib/fxRate';

export interface ExportInputs {
  period: Period;
  invoices: Invoice[];
  invoicePayments: InvoicePayment[];
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
  const periodPOs      = inputs.pos.filter((p) => inPeriod(p.created_date, period));
  const periodQuotes   = inputs.quotes.filter((q) => inPeriod(q.valid_from, period));

  // Expenses split: one-off filtered by their own date as before, recurring
  // expanded to one row per Paid period that falls in this calendar month.
  // The recurring split fixes the long-standing bug where a subscription
  // started in February would never appear in March/April/May exports.
  const periodKey = `${period.year}-${String(period.month).padStart(2, '0')}`;
  const oneOffExpenses = inputs.expenses
    .filter((e) => e.recurrence === 'None')
    .filter((e) => inPeriod(e.expense_date, period));
  const recurringRows = inputs.expenses
    .filter((e) => e.recurrence !== 'None')
    .flatMap((e) =>
      (e.periods ?? [])
        .filter((p) => p.status === 'Paid' && p.period === periodKey)
        .map((p) => ({ parent: e, period: p }))
    );
  /** Effective amount/reference for a recurring row (per-period override falls
   *  back to the parent expense's baseline). */
  const resolvedAmount = (parent: typeof inputs.expenses[number], p: typeof recurringRows[number]['period']) =>
    p.amount ?? parent.amount;
  const resolvedReference = (parent: typeof inputs.expenses[number], p: typeof recurringRows[number]['period']) =>
    p.reference ?? parent.reference;

  // Outstanding receivables/payables are NOT period-filtered — the accountant
  // wants the current open ledger regardless of when the doc was issued.
  // Partially Paid invoices count too; their `outstanding` is total − paid.
  const openInvoices = inputs.invoices.filter((i) =>
    i.status === 'Sent' || i.status === 'Overdue' || i.status === 'Partially Paid');
  const openBills    = inputs.bills.filter((b) =>
    b.status === 'Unpaid' || b.status === 'Overdue' || b.status === 'Disputed');

  // Sum of payments per invoice — used by AR (and cash-in-this-period below)
  const paidByInvoice = new Map<string, number>();
  for (const p of inputs.invoicePayments) {
    paidByInvoice.set(p.invoice_id, (paidByInvoice.get(p.invoice_id) ?? 0) + Number(p.amount));
  }

  const zip = new JSZip();

  // ── Estimate work for progress reporting ─────────────────────────────────
  const totalAttachmentDownloads =
    periodBills.reduce((n, b) => n + (b.attachments?.length ?? 0), 0) +
    oneOffExpenses.reduce((n, e) => n + (e.attachments?.length ?? 0), 0) +
    recurringRows.reduce((n, r) => n + (r.period.attachments?.length ?? 0), 0);
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
    .reduce((s, i) => s + calcInvoiceTotals(i.line_items, i.discount, i.tax, i.discount_mode).total, 0);
  const cogs = periodBills
    .filter((b) => b.status === 'Paid')
    .reduce((s, b) => s + b.amount + b.tax, 0);
  // Convert to MYR so the P&L line is consistent — non-RM subscriptions
  // (USD AWS, USD Anthropic, etc.) need the same treatment as multi-currency
  // bills/POs. Uses the rate snapshotted at the expense's date (per-period
  // for recurring rows) so historical exports stay stable.
  const opex =
    oneOffExpenses
      .filter((e) => e.status === 'Paid')
      .reduce((s, e) => s + toMYRSnapshot(e.amount, e.myr_rate, e.currency), 0) +
    recurringRows.reduce(
      (s, r) => s + toMYRSnapshot(
        resolvedAmount(r.parent, r.period),
        r.period.myr_rate ?? r.parent.myr_rate,
        r.parent.currency,
      ),
      0,
    );
  const gross = revenue - cogs;
  const net = gross - opex;

  // Cash basis: actual money collected via invoice_payments, dated within the
  // period — useful when invoices were issued before the period but partially
  // paid during it (deposits, progress, final).
  const cashCollected = inputs.invoicePayments
    .filter((p) => inPeriod(p.paid_on, period))
    .reduce((s, p) => s + Number(p.amount), 0);

  zip.file(
    '01-financial-summary/pnl-summary.csv',
    toCSV(
      ['metric', 'amount_rm'],
      [
        ['Revenue (paid invoices, accrual)', revenue.toFixed(2)],
        ['Cash collected (invoice payments dated in period)', cashCollected.toFixed(2)],
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
        ...statusBuckets(periodInvoices, (i) => i.status, (i) => calcInvoiceTotals(i.line_items, i.discount, i.tax, i.discount_mode).total)
          .map(({ status, count, total }) => ['invoices', status, count, total.toFixed(2)] as const),
        ...statusBuckets(periodBills, (b) => b.status, (b) => b.amount + b.tax)
          .map(({ status, count, total }) => ['bills', status, count, total.toFixed(2)] as const),
        // Combined: one entry per one-off row + one per Paid recurring period.
        // Recurring rows are always Paid (filter above), so they only land in the
        // Paid bucket — Pending recurring periods are intentionally invisible here.
        ...statusBuckets(
          [
            // MYR-equivalents — period-totals is a cross-currency aggregate
            // and the accountant expects all 'total_rm' columns in the same
            // currency. Native amounts live in the per-row expenses.csv.
            ...oneOffExpenses.map((e) => ({ status: e.status, amount: toMYRSnapshot(e.amount, e.myr_rate, e.currency) })),
            ...recurringRows.map((r) => ({
              status: 'Paid' as const,
              amount: toMYRSnapshot(
                resolvedAmount(r.parent, r.period),
                r.period.myr_rate ?? r.parent.myr_rate,
                r.parent.currency,
              ),
            })),
          ],
          (e) => e.status,
          (e) => e.amount,
        ).map(({ status, count, total }) => ['expenses', status, count, total.toFixed(2)] as const),
        ...statusBuckets(periodPOs, (p) => p.status, (p) => calcPOTotal(p.line_items, p.discount))
          .map(({ status, count, total }) => ['purchase_orders', status, count, total.toFixed(2)] as const),
      ].map((r) => [...r])
    )
  );

  zip.file(
    '01-financial-summary/ar-ap-summary.csv',
    toCSV(
      ['ledger', 'doc_id', 'party', 'total_rm', 'paid_rm', 'outstanding_rm', 'currency', 'issued', 'due', 'status', 'age_days'],
      [
        ...openInvoices.map((i) => {
          const total = calcInvoiceTotals(i.line_items, i.discount, i.tax, i.discount_mode).total;
          const paid = paidByInvoice.get(i.id) ?? 0;
          const outstanding = Math.max(0, total - paid);
          const age = ageDays(i.due_date);
          return [
            'AR',
            i.id,
            customerById.get(i.customer_id)?.name ?? i.customer_id,
            total.toFixed(2),
            paid.toFixed(2),
            outstanding.toFixed(2),
            'RM',
            i.issue_date,
            i.due_date,
            i.status,
            age,
          ];
        }),
        ...openBills.map((b) => {
          const total = b.amount + b.tax;
          const age = ageDays(b.due_date);
          return [
            'AP',
            b.id,
            supplierById.get(b.supplier_id ?? '')?.name ?? b.vendor,
            total.toFixed(2),
            // Bills are single-payment in the current model.
            b.status === 'Paid' ? total.toFixed(2) : '0.00',
            b.status === 'Paid' ? '0.00' : total.toFixed(2),
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
       'subtotal_rm', 'discount_mode', 'discount_value', 'discount_amt_rm', 'tax_pct', 'tax_amt_rm',
       'total_rm', 'paid_rm', 'outstanding_rm', 'deposit_percent', 'notes'],
      periodInvoices.map((i) => {
        const t = calcInvoiceTotals(i.line_items, i.discount, i.tax, i.discount_mode);
        const paid = paidByInvoice.get(i.id) ?? 0;
        const outstanding = Math.max(0, t.total - paid);
        return [
          i.id,
          i.customer_id,
          customerById.get(i.customer_id)?.name ?? '',
          i.quote_id ?? '',
          i.issue_date,
          i.due_date,
          i.status,
          t.subtotal.toFixed(2),
          i.discount_mode,
          i.discount,
          t.discountAmt.toFixed(2),
          i.tax,
          t.taxAmt.toFixed(2),
          t.total.toFixed(2),
          paid.toFixed(2),
          outstanding.toFixed(2),
          i.deposit_percent ?? '',
          i.notes ?? '',
        ];
      })
    )
  );

  // Invoice payments — every recorded payment, filtered to those dated in the
  // period (so accountants reconciling a single month see only that month's
  // cash movements, even if the parent invoice was issued earlier).
  const periodPayments = inputs.invoicePayments.filter((p) => inPeriod(p.paid_on, period));
  zip.file(
    '02-revenue/invoice-payments.csv',
    toCSV(
      ['payment_id', 'invoice_id', 'paid_on', 'amount_rm', 'method', 'reference', 'label', 'notes'],
      periodPayments.map((p) => [
        p.id, p.invoice_id, p.paid_on, Number(p.amount).toFixed(2),
        p.method ?? '', p.reference ?? '', p.label ?? '', p.notes ?? '',
      ])
    )
  );

  // Sales orders cross-ref: feature is scaffold-only; ship an empty placeholder
  // CSV so the structure matches the accountant's expected layout.
  zip.file(
    '02-revenue/sales-orders.csv',
    toCSV(['id', 'customer_id', 'status', 'created_date', 'total_rm'], [])
  );

  // Render invoice PDFs (with their payment history attached)
  const paymentsByInvoice = new Map<string, InvoicePayment[]>();
  for (const p of inputs.invoicePayments) {
    const arr = paymentsByInvoice.get(p.invoice_id) ?? [];
    arr.push(p);
    paymentsByInvoice.set(p.invoice_id, arr);
  }
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
        payments: paymentsByInvoice.get(inv.id) ?? [],
      })
    ).toBlob();
    zip.file(`02-revenue/pdfs/${safeFile(`${inv.id} (${customer?.name ?? ''})`.trim())}.pdf`, blob);
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
    zip.file(`03-cogs/po-pdfs/${safeFile(`${po.id} (${supplier?.name ?? ''})`.trim())}.pdf`, blob);
    tick(`Rendered ${po.id}`);
  }

  // ── 04-expenses ─────────────────────────────────────────────────────────
  // Two row shapes: one-off (today's behavior) + one Paid period per recurring
  // expense that landed in this month. Recurring rows get a composite id
  // ("EXP-XXXXXX / 2026-02") so the accountant can sort/group on it.
  zip.file(
    '04-expenses/expenses.csv',
    toCSV(
      // Both native amount and MYR-equivalent: native is what the user actually
      // paid, MYR is what the accountant uses for cross-currency aggregates.
      // `myr_rate` is the snapshotted rate used for the conversion — included
      // so the accountant can audit / re-derive the MYR column.
      ['id', 'expense_date', 'category', 'payee', 'supplier_id', 'entity', 'currency', 'amount',
       'myr_rate', 'amount_myr', 'payment_method', 'reference', 'recurrence', 'status', 'paid_on', 'notes'],
      [
        ...oneOffExpenses.map((e) => [
          e.id, e.expense_date, e.category, e.payee, e.supplier_id ?? '', e.entity ?? '',
          e.currency, e.amount.toFixed(2),
          e.myr_rate != null ? Number(e.myr_rate).toFixed(6) : '',
          toMYRSnapshot(e.amount, e.myr_rate, e.currency).toFixed(2),
          e.payment_method ?? '', e.reference ?? '', e.recurrence,
          e.status, e.paid_on ?? '', e.notes ?? '',
        ]),
        ...recurringRows.map(({ parent, period: p }) => {
          const native = resolvedAmount(parent, p);
          const rate = p.myr_rate ?? parent.myr_rate;
          return [
            `${parent.id} / ${p.period}`,
            p.paid_on ?? `${p.period}-01`,
            parent.category,
            parent.payee,
            parent.supplier_id ?? '',
            parent.entity ?? '',
            parent.currency,
            native.toFixed(2),
            rate != null ? Number(rate).toFixed(6) : '',
            toMYRSnapshot(native, rate, parent.currency).toFixed(2),
            parent.payment_method ?? '',
            resolvedReference(parent, p) ?? '',
            parent.recurrence,
            'Paid',
            p.paid_on ?? '',
            parent.notes ?? '',
          ];
        }),
      ]
    )
  );

  // Attachments: top-level for one-off, per-period for recurring (filed under
  // the period subfolder so the accountant can match invoice ↔ row by name).
  for (const e of oneOffExpenses) {
    for (const att of e.attachments ?? []) {
      onProgress({ message: `Downloading ${e.id} / ${att.name}…`, fraction: stepsDone / totalSteps });
      const blob = await fetchAttachmentBlob(att.storage_path);
      if (!blob) { tick(`Skipped ${att.name}`); continue; }
      const ext = deriveExtFromMime(att.mime);
      zip.file(`04-expenses/attachments/${safeFile(e.id)}-${safeFile(att.name) || 'file'}.${ext}`, blob);
      tick(`Saved ${att.name}`);
    }
  }
  for (const { parent, period: p } of recurringRows) {
    for (const att of p.attachments ?? []) {
      onProgress({ message: `Downloading ${parent.id} / ${p.period} / ${att.name}…`, fraction: stepsDone / totalSteps });
      const blob = await fetchAttachmentBlob(att.storage_path);
      if (!blob) { tick(`Skipped ${att.name}`); continue; }
      const ext = deriveExtFromMime(att.mime);
      zip.file(`04-expenses/attachments/${safeFile(parent.id)}-${p.period}-${safeFile(att.name) || 'file'}.${ext}`, blob);
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
    `Voltara — Monthly Export (${period.label})`,
    `Period: ${period.startISO} → ${period.endISO}`,
    `Generated: ${new Date().toISOString()}`,
    '',
    'Folder layout:',
    '  01-financial-summary/   P&L (accrual + cash), period totals, AR/AP open ledger',
    '  02-revenue/             Invoices CSV + payments CSV + rendered PDFs',
    '  03-cogs/                Bills CSV + supplier-side documents + PO cross-ref',
    '  04-expenses/            Operating expenses CSV + attachments',
    '  05-master-data/         Customers / Suppliers / Products lookup tables',
    '  06-sales-pipeline/      Optional — quotations and sales orders for context',
    '',
    'All CSVs are UTF-8 with a BOM and use comma separators (RFC 4180).',
    'Money columns are in the entity\'s recorded currency unless noted "_rm".',
    '',
    'Notes:',
    '  - Multi-currency entities (POs, Bills) include a "currency" column.',
    '    The P&L aggregates across all currencies as if RM — convert if mixed.',
    '  - Invoices CSV includes paid_rm / outstanding_rm so partial-payment',
    '    invoices are reconcilable directly from the row.',
    '  - invoice-payments.csv lists individual deposit / progress / final',
    '    payments dated in this period. Sum should equal "Cash collected"',
    '    in the P&L summary.',
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
