# Invoice PDF — extension point

This folder is intentionally a **drop-in slot** for the existing PDF-invoice project. The `InvoiceModal` "Print PDF" button calls into `./index.ts`; replacing that file is the only wiring you need to do.

## Contract

`./index.ts` must export:

```ts
import type { Invoice } from '../types';

export interface RenderInvoicePdfOptions {
  paperSize?: 'A4' | 'Letter';   // default A4
  locale?: 'en' | 'ms';          // default en
}

export async function renderInvoicePDF(
  invoice: Invoice,
  opts?: RenderInvoicePdfOptions,
): Promise<Blob>;
```

The `Invoice` type carries `customer_id`, `line_items` (array of `{ product_id, qty, unit_price_snapshot }`), `discount`, `tax`, `notes`, dates, and status. Resolve the customer/products via the canonical pickers' hooks (`useCustomers`, `useProducts`) **inside the renderer's UI layer**, NOT here — this file should stay pure (no React).

If your renderer needs the customer / products as objects rather than ids, add a thin wrapper helper inside this folder that fetches them via `supabase.from(...)` and passes the resolved data to your renderer. Keep all PDF-specific deps (templates, fonts, jsPDF / pdfmake / react-pdf) inside this folder.

## How to merge in your existing project

1. Copy your renderer's source files into this folder (e.g. `template.tsx`, `assets/`).
2. Replace the placeholder `index.ts` with one that re-exports `renderInvoicePDF` matching the contract above.
3. Apply the **Restyle on import** rule from `CLAUDE.md` — replace any colour literals with `C.*` from `@/shared/tokens` and switch the font stack to Figtree.
4. Add any new dependencies to `package.json`. Try to keep them within this folder's scope (don't promote PDF-only deps to `shared/`).
5. The `Print PDF` button is already wired — a successful build proves the integration.

## Why this folder exists

`CLAUDE.md` §3 enforces feature isolation — anything PDF-specific stays here so it can be developed, versioned, and merged independently of the rest of the dashboard.
