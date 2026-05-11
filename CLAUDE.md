# CLAUDE.md — Voltara Operations Dashboard

This file is loaded by every Claude Code session in this repo. Read it before making changes. It locks in the visual identity and the architecture; any code that lands here — including external code being merged in — must conform to both.

---

## 1. Brand identity (locked)

These tokens come straight from the original Claude Design handoff bundle. Never substitute them. Always import from `@/shared/tokens`, never inline a hex value in feature code.

### Palette

| Token       | Hex       | Use |
|-------------|-----------|-----|
| `C.green`   | `#1B512D` | Primary brand colour. Headings, primary buttons, KPI text, active-nav indicator. |
| `C.yellow`  | `#FECC3E` | Accent, lightning bolt, emphasis numerals on dark backgrounds. |
| `C.honeydew`| `#E4F3E3` | Soft green tint. Active nav background, info pills, soft accents. |
| `C.opal`    | `#97C8C0` | Secondary chart colour, soft data viz. |
| `C.seasalt` | `#F9F9F9` | App background, table header, hover row background. |
| `C.white`   | `#FFFFFF` | Cards, modals, inputs. |
| `C.slate`   | `#767B77` | Secondary text, muted labels, borders' shadow side. |

### Status pill colours (single source of truth)

| Status      | bg        | color     |
|-------------|-----------|-----------|
| Completed   | `#E4F3E3` | `#1B512D` |
| Pending     | `#FFF8E1` | `#B07D00` |
| In Progress | `#E3F0FF` | `#1A62C0` |
| Cancelled   | `#FDEAEA` | `#C0321A` |
| Active      | `#E4F3E3` | `#1B512D` |
| Inactive    | `#F3F3F3` | `#767B77` |
| Overdue     | `#FDEAEA` | `#C0321A` |
| Draft       | `#F3F3F3` | `#767B77` |
| Sent        | `#E3F0FF` | `#1A62C0` |
| Paid        | `#E4F3E3` | `#1B512D` |

### Typography

- Family: **Figtree**, Google Fonts. Loaded in `index.html`.
- Weights: 400 / 500 / 600 / 700 / 800.
- Headings 700; body 500; labels 600 with `letter-spacing: 0.05em` and `text-transform: uppercase` for tiny captions (11–12px).
- Numerals on KPI cards: 32px / 700 / `letter-spacing: -0.04em`.

### Spacing scale

`6 · 10 · 12 · 16 · 20 · 24 · 28`. Page content padding is `28`. Card inner padding is `20px 24px`.

### Radii

| Radius | Use |
|---|---|
| 6  | Chips, table-cell badges |
| 8  | Small inputs |
| 10 | Buttons, date inputs |
| 12 | Sub-cards, nested panels |
| 16 | Cards |
| 20 | Modals |
| 99 | Pills (status, filter) |

### Borders & dividers

- Card border: `1px solid #EBEBEB`.
- Inner divider: `1px solid #F3F3F3`.
- Row hover background: `#FAFAFA`.
- Modal backdrop: `rgba(0,0,0,0.32)`.
- Modal shadow: `0 24px 64px rgba(0,0,0,.18)`.

---

## 2. Component patterns (always reuse these)

All live in `src/shared/components/`. **Do not duplicate them inside a feature.** If a feature needs a variant, extend the shared component or accept it as a prop — don't fork.

| Pattern | Component | Notes |
|---|---|---|
| KPI tile | `KPICard` | 4-up grid (`grid-template-columns: repeat(4, 1fr); gap: 14–16px`). First card is often `accent` (dark green bg, yellow numerals). |
| Status badge | `Badge` / `StatusPill` | 11px / 700 / `padding: 3px 10px` / `borderRadius: 99`. Colour map above. |
| Modal shell | `Modal` | 640px wide; `borderRadius: 20`; `padding: 28`; shadow + dim backdrop. Close button is a 32×32 grey square `×` top-right. |
| Filter + search bar | `Toolbar` | Status pills (left) + search input (`borderRadius: 99`, leading `⌕` glyph) + primary button (`marginLeft: auto`). |
| Sidebar nav row | `NavItem` | 14/500, `padding: 10px 16px`, active state = `C.honeydew` bg + `C.green` text + 6px green dot at right. |
| Table | (composed) | Header row `background: #F9F9F9`; header cell `11px 700 #767B77 uppercase letter-spacing 0.05em`; row hover `#FAFAFA`; row divider `1px solid #F3F3F3`. |
| Empty state | (composed) | Centered `padding: 32px; color: #767B77; font-size: 14px`. |

Charts (`Sparkline`, `MiniBar`, `Donut`, `LineChart`, `BarChart`) are pure SVG — no chart libraries. Match the prototype's visual exactly.

---

## 3. Architecture (locked)

```
src/
├── app/        # shell only — sidebar, topbar, screen router
├── shared/     # tokens, styles, lib, components — everything cross-feature
└── features/<name>/
    ├── index.ts        # PUBLIC API — only this is importable from outside
    ├── types.ts
    ├── api.ts          # raw supabase calls
    ├── hooks.ts        # TanStack Query wrappers
    ├── <Name>Screen.tsx
    ├── <Name>Modal.tsx
    └── …               # any feature-private files
```

### Module rules (enforced)

1. **Feature isolation.** A feature may import only from `@/shared/*` and from another feature's `@/features/<name>` barrel. Never `@/features/customers/api` from outside `customers/`. If you need something from another feature, it must be in that feature's `index.ts` exports.
2. **No supabase calls in screens.** Always go through a `useX` / `useCreateX` hook. Screens render data; hooks own data access; `api.ts` owns the network layer.
3. **Adding a feature** = create `src/features/<name>/`, add one entry to `src/app/nav.ts` and `src/app/routes.ts`. No other shell changes.
4. **Adding a column** = migration first, regenerate types (`npm run gen:types`), update the feature's `types.ts` re-export, update modal/screen.
5. **Canonical entities.** Customers, suppliers, and products live in their own features and are referenced by FK from every transactional table. Never re-key them in another modal — always use `CustomerPicker` / `SupplierPicker` / `ProductPicker`.
6. **Snapshot, don't denormalise.** When a transactional row needs a price (e.g. invoice line items), snapshot it at write time as `unit_price_snapshot`. Don't store derivable fields like "customer total spend" — compute via SQL views.

### Extension points

- **`src/features/invoices/pdf/`** — drop your existing PDF-invoice project here. Contract: `export async function renderInvoicePDF(invoice, opts?) → Promise<Blob>`. Anything the renderer needs (templates, fonts, assets) lives inside `pdf/`. See `pdf/README.md`.
- **Whole feature folders** — develop a screen elsewhere, then copy `features/<name>/` in + add nav/route entries.
- **Migrations** — additive only. Add `00NN_<feature>.sql`, never edit prior migrations.

---

## 4. Restyle-on-import rule

When integrating an external project (e.g. the invoice PDF renderer, a new feature folder developed in another repo) into this codebase:

1. Replace all colour literals with `C.*` from `@/shared/tokens`. No hex codes in feature code.
2. Replace any other font stack with Figtree.
3. Re-skin all visible UI to match section 2 patterns — KPI tiles, status pills, toolbars, modal shell — before committing.
4. Move any data access into the feature's `api.ts` + `hooks.ts`. No raw `supabase.from(…)` anywhere outside that.
5. If the imported code conflicts with the feature-isolation rule, refactor it. **Do not bend the rule** to accommodate external code — the rule exists so the codebase stays merge-friendly long term.

When in doubt: open a sibling feature folder (`features/customers/`) as the canonical example.

---

## 5. Common workflows

| Task | Steps |
|---|---|
| Add a new screen "X" | `cp -r src/features/customers src/features/x` → rename, gut, rebuild → add migration `00NN_x.sql` → add to `app/nav.ts` + `app/routes.ts`. |
| Add a column to invoices | New migration → `npm run gen:types` → update `Invoice` re-export in `features/invoices/types.ts` → update modal + screen. |
| "The customer in Sales should be the same one as in Invoices" | Both modals must use `CustomerPicker` from `@/features/customers`. If one is using a free-text input, fix it. |
| Integrating the PDF project | Land it under `features/invoices/pdf/`. Follow the restyle rule. The `Print PDF` button in `InvoiceModal` is already wired to `renderInvoicePDF(invoice)`. |

---

## 6. What NOT to do

- ❌ Inline hex colours in feature code.
- ❌ `supabase.from(…)` outside `features/<x>/api.ts`.
- ❌ Reach into another feature's internals (`@/features/foo/hooks` from `features/bar`).
- ❌ Duplicate a shared component (KPICard, Modal, Toolbar) inside a feature.
- ❌ Mutate prior migrations. Add a new one.
- ❌ Store derivable fields. Use SQL views (`vw_customer_stats`, `vw_supplier_stats`).
- ❌ Re-key a customer / supplier / product. Use the canonical picker.

---

## 7. Current feature roster

```
src/features/
├── overview/          # KPIs and charts dashboard
├── customers/         # canonical customers + CustomerPicker
├── sales/             # quotations + proposals + pdf/
├── sales-orders/      # scaffold (KPIs + empty state, no DB yet)
├── sales-managers/    # canonical SalesManagerPicker
├── invoices/          # invoices + pdf/, linked to Case Won quotes
├── purchase-orders/   # outgoing POs only + pdf/, multi-currency
├── bills/             # COGS bills, multi-currency
├── expenses/          # operating expenses
├── installations/     # installations + delivery-order pdf/
├── products/          # canonical ProductPicker
├── suppliers/         # Supplier / Vendor / Contractor tabs + SupplierCategoryPicker
├── form-designs/      # company profile + per-doc-type design
├── social/            # social media planner
├── seo/               # SEO monitor
└── supabase-health/   # internal diagnostics
```

Sidebar groups in `src/app/nav.ts`: **Operations**, **Accounting** (Purchase Orders, Invoices, Bills, Expenses), **Sales & CRM** (Customers, Sales, Sales Orders, Sales Managers), **Inventory**, **Marketing**, **Settings**.

---

## 8. PDF rendering (locked)

Live under `src/features/<name>/pdf/`. **Browser print is not supported** — Chrome's `position: fixed` + `@page` margin combination is unreliable for repeating header/footer. Use `@react-pdf/renderer` only.

| Concern | Rule |
|---|---|
| Library | `@react-pdf/renderer` (`Document`, `Page`, `View`, `Text`, `Image`, `Font`) |
| Font | `Font.register({ family: 'Figtree', … })` from `@fontsource/figtree` via jsDelivr (WOFF, weights 400/500/600/700/800) |
| Repeating header/footer | `<View fixed>` — never CSS print tricks |
| Row break protection | `<View wrap={false}>` per line-item row |
| Page bottom padding | Computed dynamically from active footer sections — do **not** reserve worst-case space |
| Page number | `<Text render={({ pageNumber, totalPages }) => …}>` — never `counter(page)` |
| Form design source | `useDesign(docType)` from `@/features/form-designs` — column visibility, accent colour, terms, signature block, payment instructions, footer text |
| Live data | Derive from query in the screen (see §11) — never print stale captured state |

Standard layout, top to bottom: logo + company block → accent title bar (`<DocType>` flush left, ref id + dates flush right) → `BILL TO` / `SUPPLIER` block → optional header note → repeating column header → line items (`wrap={false}`) → totals box → notes panel → fixed footer (payment instructions, T&C, signature blocks, footer text + page number).

Each PDF feature exports `<Name>Pdf.tsx` (the document) and `<Name>PrintModal.tsx` (PDFViewer + PDFDownloadLink overlay). The `Print PDF` button is shown only on existing records (needs a persisted row).

---

## 9. Multi-currency (POs + Bills)

- `currency` column on `purchase_orders` and `bills`: text NOT NULL DEFAULT `'RM'`, CHECK in (`'RM'`, `'CNY'`, `'SGD'`, `'USD'`).
- Always render row totals using **each row's own currency** — never a global format helper.
- Modal label dynamically reflects choice: `Amount ({currency})`.
- KPIs that sum across all rows are mathematically lossy when currencies are mixed — known limitation; only convert to a base currency if/when explicitly asked.
- Quotes and Invoices are RM-only by design (customer-facing in MY).

---

## 10. Suppliers — three kinds + per-kind categories

- `suppliers.kind`: `'Supplier' | 'Vendor' | 'Contractor'` (NOT NULL, default `'Supplier'`, CHECK constraint).
- The Suppliers screen renders three tabs at the top; switching tabs filters the card grid AND swaps the active category list.
- `supplier_categories` table is composite-PK on `(name, kind)` — categories are **not shared across kinds**.
- `SupplierCategoryPicker` is a custom Voltara-styled dropdown with inline add and per-row delete; it **must** receive `kind` as a prop and uses the kind-scoped hooks.
- `SupplierPicker` accepts `filterKinds: SupplierKind[]` — defaults to `['Supplier']`. POs and Products keep the default; `BillModal` opts into all three (`['Supplier', 'Vendor', 'Contractor']`).
- POs are **suppliers-only** by business rule, not just by default.

---

## 11. Modal patterns (locked across all entity modals)

These are the canonical patterns for every modal that mutates data (Quote, Invoice, PO, Bill, Supplier, Customer, etc.). Apply uniformly.

### Confirm-delete (two-step)
First click of `Delete` swaps the row to: `<span>Permanent — cannot be undone.</span>` + `Confirm Delete` (red) + `Cancel`. Reset on close.

### Save flow
- Pass `isSaving={createMut.isPending || updateMut.isPending}` from screen → modal.
- Save button shows `Saving…` and uses `cursor: wait` while mutation is in flight.
- After **edit**-save, **do not** close the modal — let the user click `Print PDF` immediately. Only close on **create**-save (`onSuccess: () => setModal(null)`).

### Mutation error reset
```ts
useEffect(() => {
  createMut.reset();
  updateMut.reset();
}, [modal]);
```
Otherwise TanStack Query keeps the previous failure visible across modal opens.

### Strip view-only fields before mutating
If the screen lists rows from a view-augmented hook (e.g. `useSuppliersWithStats`), the modal's `form` carries extra columns like `po_count` / `total_spend`. Strip them in `handleSave` before `mutate` — Supabase rejects updates with unknown columns silently.

### Button order (locked)
Left side, in order: `Delete` → `Print PDF` (if applicable). Then `marginLeft: 'auto'` on `Cancel`. Then `Save Changes` rightmost.

### Inline status dropdown (table cells)
For Sales / Invoices / POs, the Status column is a pill-shaped `<select>`:
- `appearance: 'none'`, palette from `STATUS_COLORS`, `borderRadius: 99`.
- Wrap `<td onClick={(e) => e.stopPropagation()}>` so changing status doesn't open the row's edit modal.
- On change: `updateMut.mutate({ id, patch: { status: next } })` directly — no confirmation modal except where business rules demand it (e.g. quotes deducting stock on Case Won).

---

## 12. Live-derived modal data

```ts
const modalRecord = modal && modal !== 'new'
  ? (records.find((r) => r.id === modal.id) ?? modal)
  : null;
```

Always pass `modalRecord` to the modal — never the captured snapshot from `setModal(row)`. After a save the query is invalidated; without this derivation the modal (and any child print modal) would render stale notes / totals / line items.

---

## 13. Attachments via Supabase Storage

- Bucket: `attachments` (public, permissive RLS — matches the rest of the app).
- Path convention: `{table}/{record_id}/{uuid}-{filename}`.
- **Never** store base64 `data_url` blobs in JSONB. The `Attachment` shape is `{ name, mime, storage_path, size, uploaded_at }`.
- Use the shared `AttachmentsField` from `@/shared/components/AttachmentsField` — it owns drag-drop, image resizing, 5-file/2 MB limits, view-via-publicUrl, and confirm-remove. Pass `storagePath` (folder prefix).
- On record delete, the feature's `api.ts` deleter must remove the storage paths **before** the DB delete:
  ```ts
  if (paths.length) await supabase.storage.from('attachments').remove(paths);
  await supabase.from('<table>').delete().eq('id', id);
  ```
- Hooks and screens must thread `attachments` (and per-kind variants like `proposal_attachments`, `customer_po_attachments`) through to the deleter.

---

## 14. Multi-line text fields

- Customer and Supplier `address` are `<textarea rows={3}>` with `whiteSpace: 'pre-wrap'` on the input style. Newlines round-trip through Supabase and `@react-pdf/renderer` without special handling.
- Same pattern for any descriptive prose field: quote `notes`, quote `remarks`, bill `notes`, etc.

---

## 15. Quote remarks (internal-only)

- `quotes.remarks` (text, nullable) is **internal**. The picker has yellow-tinted styling and a `(not printed)` hint in the label.
- `QuotePdf` and any future quote renderer **must not** read this field. Treat it like an audit comment.

---

## 16. PO line items: catalogue vs custom

POs accept two kinds of line items:
- **Catalogue**: `product_id` populated → `ProductPicker` for label, snapshot price from product.
- **Custom**: `product_id === ''`, `description` carries the label (e.g. `Shipping`, `Handling`). Save is gated so a custom row's description must be non-empty.

The PDF renders custom rows by using `description` as the line label and skipping the secondary detail line.

---

## 17. Invoice ↔ quote linkage

- `invoices.quote_id` is a nullable FK to `quotes.id`.
- New invoices **require** a `quote_id` and the picker is restricted to `status === 'Case Won'` quotes.
- On selection, `customer_id`, `line_items`, `discount`, and `notes` are auto-synced from the quote (snapshot, not denormalised).
- Editing an existing invoice disables the picker but exposes a "Re-sync from quote" button when fields drift.

---

## 18. Sales-table specifics

- **Items column removed.** Replaced by **Days Idle** between Status and Last Follow-up.
- Days Idle shows `Today`, or `${days} day(s)` styled red/bold past 7 days, only when status is `Sent`. Otherwise italic `—`.
- Days source: `q.last_followup_date ?? q.valid_from`.

---

## 19. Recently added migrations (additive only — never edit prior ones)

```
0010_installations_quote_link.sql
0011_sales_manager_avatar.sql
0012_quote_won_at.sql
0013_expenses.sql
0014_expense_entity_and_periods.sql
0015_quote_last_followup.sql
0016_quote_customer_po_attachments.sql
0017_bills.sql
0018_invoices_quote_link.sql
0019_quote_remarks.sql
0020_quote_proposal_attachments.sql
0021_supplier_kind.sql
0022_supplier_categories.sql
0023_supplier_categories_per_kind.sql        # composite PK (name, kind)
0024_po_currency.sql
0025_bill_currency.sql
```

When adding the next migration, name it `00NN_<topic>.sql` and apply via Supabase MCP `apply_migration`. Then update the corresponding stub in `src/shared/lib/database.types.ts` (the file is hand-maintained, not generated against the live DB by default).

---

## 20. What NOT to do (additions)

- ❌ Use browser `window.print()` or CSS `@page` for PDF output. Use `@react-pdf/renderer`.
- ❌ Render money with a hardcoded `RM ` prefix on multi-currency entities (POs, Bills). Use `${row.currency} ${value.toLocaleString(...)}`.
- ❌ Share supplier categories across kinds — query by `(kind, name)`.
- ❌ Allow vendors or contractors in `SupplierPicker` for POs / Products. Only Bills opt into all three kinds.
- ❌ Close the modal automatically on edit-save. Leave it open so the user can print.
- ❌ Pass `SupplierWithStats` (or any view-augmented row) directly into a modal patch — Supabase will reject the update.
- ❌ Read `quotes.remarks` from any rendered PDF. It's internal-only.
- ❌ Capture-at-click modal data. Always derive `modalRecord` from the live query (§12).
