import { useMemo, useState } from 'react';
import { C } from '@/shared/tokens';
import { KPICard } from '@/shared/components/KPICard';
import { useInvoices } from '@/features/invoices';
import { useAllInvoicePayments } from '@/features/invoices/payments/hooks';
import { useBills } from '@/features/bills';
import { useExpenses } from '@/features/expenses';
import { usePurchaseOrders } from '@/features/purchase-orders';
import { useQuotes } from '@/features/sales';
import { useCustomers } from '@/features/customers';
import { useSuppliers } from '@/features/suppliers';
import { useProducts } from '@/features/products';
import { useDesign } from '@/features/form-designs';
import { buildExportZip, type BuildProgress } from './builder';
import { makePeriod, currentMonth, type Month, inPeriod } from './period';

const MONTHS: { id: Month; label: string }[] = [
  { id: 1,  label: 'January'   },
  { id: 2,  label: 'February'  },
  { id: 3,  label: 'March'     },
  { id: 4,  label: 'April'     },
  { id: 5,  label: 'May'       },
  { id: 6,  label: 'June'      },
  { id: 7,  label: 'July'      },
  { id: 8,  label: 'August'    },
  { id: 9,  label: 'September' },
  { id: 10, label: 'October'   },
  { id: 11, label: 'November'  },
  { id: 12, label: 'December'  },
];

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: C.slate,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  display: 'block',
  marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontFamily: 'Figtree',
  fontSize: 13,
  outline: 'none',
};

export function ExportsScreen() {
  const { data: invoices = [] } = useInvoices();
  const { data: invoicePayments = [] } = useAllInvoicePayments();
  const { data: bills = [] } = useBills();
  const { data: expenses = [] } = useExpenses();
  const { data: pos = [] } = usePurchaseOrders();
  const { data: quotes = [] } = useQuotes();
  const { data: customers = [] } = useCustomers();
  const { data: suppliers = [] } = useSuppliers();
  const { data: products = [] } = useProducts();
  const invoiceDesign = useDesign('invoice');
  const poDesign = useDesign('purchase_order');

  const initial = currentMonth();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState<Month>(initial.month);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const period = useMemo(() => makePeriod(year, month), [year, month]);

  // Period-scoped previews so the user knows what they're about to export.
  const previewCounts = useMemo(() => {
    const periodInvoices = invoices.filter((i) => inPeriod(i.issue_date, period));
    const periodBills = bills.filter((b) => inPeriod(b.bill_date, period));
    const periodExpenses = expenses.filter((e) => inPeriod(e.expense_date, period));
    const periodPOs = pos.filter((p) => inPeriod(p.created_date, period));
    const periodQuotes = quotes.filter((q) => inPeriod(q.valid_from, period));
    const billAtt = periodBills.reduce((n, b) => n + (b.attachments?.length ?? 0), 0);
    const expAtt = periodExpenses.reduce((n, e) => n + (e.attachments?.length ?? 0), 0);
    return {
      invoices: periodInvoices.length,
      bills: periodBills.length,
      expenses: periodExpenses.length,
      pos: periodPOs.length,
      quotes: periodQuotes.length,
      attachments: billAtt + expAtt,
      pdfRenders: periodInvoices.length + periodPOs.length,
    };
  }, [invoices, bills, expenses, pos, quotes, period]);

  const ready =
    !invoiceDesign.isLoading && invoiceDesign.profile && invoiceDesign.design &&
    !poDesign.isLoading && poDesign.profile && poDesign.design;

  const handleExport = async () => {
    if (!ready) return;
    setError(null);
    setProgress({ message: 'Starting…', fraction: 0 });
    try {
      const blob = await buildExportZip(
        {
          period,
          invoices, invoicePayments, bills, expenses, pos, quotes,
          customers, suppliers, products,
          invoiceProfile: invoiceDesign.profile!,
          invoiceDesign: invoiceDesign.design!,
          poProfile: poDesign.profile!,
          poDesign: poDesign.design!,
        },
        (p) => setProgress(p)
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${period.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (e) {
      setError((e as Error).message ?? 'Export failed');
    } finally {
      // Keep the progress visible for a moment, then clear so the form is reusable.
      setTimeout(() => setProgress(null), 1_500);
    }
  };

  const isRunning = progress !== null && progress.fraction < 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <KPICard label={`Invoices in ${period.label}`} value={previewCounts.invoices} sub="Will render PDF" accent />
        <KPICard label="Bills" value={previewCounts.bills} sub={`${previewCounts.attachments} attachments`} />
        <KPICard label="Expenses" value={previewCounts.expenses} sub={`${previewCounts.expenses} rows`} />
        <KPICard label="PDF renders" value={previewCounts.pdfRenders} sub="Invoices + POs" />
      </div>

      <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.green, marginBottom: 4 }}>Monthly export</div>
        <div style={{ fontSize: 12, color: C.slate, marginBottom: 18 }}>
          Bundles invoices, invoice payments, bills, expenses, POs, master data, and the matching
          attachments and PDFs into a single ZIP for your accountant. Period: <strong>{period.startISO} → {period.endISO}</strong>.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 480 }}>
          <div>
            <label style={labelStyle}>Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10) as Month)}
              style={inputStyle}
              disabled={isRunning}
            >
              {MONTHS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10) || initial.year)}
              style={inputStyle}
              disabled={isRunning}
            />
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleExport}
            disabled={!ready || isRunning}
            style={{
              padding: '10px 22px', borderRadius: 10, border: 'none',
              background: !ready || isRunning ? C.slate : C.green,
              color: C.white, fontFamily: 'Figtree', fontSize: 13, fontWeight: 700,
              cursor: !ready || isRunning ? 'wait' : 'pointer',
            }}
          >
            {isRunning ? 'Generating…' : `↓ Generate ${period.slug}.zip`}
          </button>
          {!ready && (
            <span style={{ fontSize: 12, color: C.slate }}>Loading form designs…</span>
          )}
        </div>

        {progress && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: C.slate }}>{progress.message}</span>
              <span style={{ fontSize: 12, color: C.slate }}>{Math.round(progress.fraction * 100)}%</span>
            </div>
            <div style={{ background: C.divider, borderRadius: 99, height: 7, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.round(progress.fraction * 100)}%`,
                  height: '100%',
                  background: progress.fraction >= 1 ? C.green : C.opal,
                  transition: 'width 200ms',
                }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 14, padding: '10px 12px', background: '#FDEAEA', color: '#C0321A', fontSize: 12, fontWeight: 600, borderRadius: 8 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{ background: C.seasalt, borderRadius: 12, padding: '14px 18px', fontSize: 12, color: C.slate, lineHeight: 1.6 }}>
        <strong style={{ color: C.green }}>Folder layout</strong> &middot; 01-financial-summary (P&amp;L + AR/AP with paid/outstanding) &middot;
        02-revenue (invoices, invoice payments, PDFs) &middot; 03-cogs (bills, attachments, PO PDFs) &middot;
        04-expenses (CSV + attachments) &middot; 05-master-data (customers, suppliers, products) &middot;
        06-sales-pipeline (quotations).
      </div>
    </div>
  );
}
