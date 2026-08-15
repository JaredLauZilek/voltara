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
3. **Adding a feature** = create `src/features/<name>/`, add one entry to `src/app/nav.tsx` and `src/app/routes.tsx`. No other shell changes.
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
| Add a new screen "X" | `cp -r src/features/customers src/features/x` → rename, gut, rebuild → add migration `00NN_x.sql` → add to `app/nav.tsx` + `app/routes.tsx`. |
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

**`src/app/nav.tsx` is authoritative** — it is the only file that knows the full feature list. The roster below is orientation, not a source of truth; if the two disagree, believe `nav.tsx` and fix this list. Update both in the same commit as a new feature.

```
src/features/
├── overview/          # KPIs and charts dashboard
├── todo/              # To-Do screen (tasks table)
├── customers/         # canonical customers + CustomerPicker + CSV import
├── sales/             # quotations + proposals + pdf/ + whatsapp/
├── sales-orders/      # customer-PO record linked to Case Won quotes
├── sales-managers/    # canonical SalesManagerPicker
├── invoices/          # invoices + pdf/ + payments/, linked to Case Won quotes
├── purchase-orders/   # outgoing POs only + pdf/, multi-currency
├── bills/             # COGS bills, multi-currency, 1:1 to installations
├── expenses/          # operating expenses, multi-currency
├── installations/     # installations + delivery-order pdf/
├── products/          # canonical ProductPicker + engagement stock
├── suppliers/         # Supplier / Vendor / Contractor tabs + SupplierCategoryPicker
├── form-designs/      # company profile + per-doc-type design
├── email-designs/     # per-doc-type email envelope + Resend send pipeline
├── social/            # social media planner
├── ai-blogger/        # competitor-aware drafting → Wix publish → Ahrefs SEO
├── seo/               # SEO monitor
├── exports/           # monthly zip exports
├── snapshots/         # DB + attachments backup history
└── supabase-health/   # internal diagnostics
```

Sidebar groups in `src/app/nav.tsx`: **Operations**, **Accounting** (Purchase Orders, Invoices, Bills, Expenses), **Sales & CRM** (Customers, Sales, Sales Orders, Sales Managers), **Inventory**, **Marketing**, **Settings**.

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

- Bucket: `attachments` (public **reads**, authenticated writes — see §21 for why reads must stay open).
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

## 19. Migrations (additive only — never edit prior ones)

**Never keep a list of migrations in this file.** It used to enumerate them, drifted thirty files behind, and then actively caused harm: it instructed sessions to number the next migration by following a list that stopped at `0025`, which collides with five months of existing files. `supabase/migrations/` is the source of truth.

**Find the next number:**

```bash
ls supabase/migrations/ | tail -1     # highest existing; next is +1
```

**Adding one:**

1. Write `supabase/migrations/00NN_<topic>.sql`.
2. Apply via Supabase MCP `apply_migration`, passing `00NN_<topic>` as the name so the remote ledger matches the filename.
3. **Write the file to disk even when you applied it through MCP.** `apply_migration` changes the database only — a migration that exists remotely but not in the repo cannot be replayed into a fresh project, and nothing warns you.
4. Update the matching stub in `src/shared/lib/database.types.ts` (hand-maintained, not generated against the live DB by default).

**Check they agree** — these two numbers must match:

```bash
ls supabase/migrations/*.sql | wc -l          # repo
# vs Supabase MCP list_migrations             # database
```

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
- ❌ Grant an RLS policy to `public` / `anon`. See §21 — the anon key is in the client bundle, so that is equivalent to publishing the table.
- ❌ Lock down `SELECT` on the `attachments` bucket. Outgoing PDFs depend on public reads (§21).
- ❌ Maintain a list of migrations in this file (§19).
- ❌ Apply a migration via MCP without also committing the `.sql` file (§19).

---

## 21. Authentication & access control (locked)

Added 2026-08-15, replacing a frontend-only password gate that protected nothing.

| Concern | Rule |
|---|---|
| Gate | `src/app/AuthGate.tsx` — real Supabase session. Provides `useAuth()` → `{ session, email, signOut }`. There is no hardcoded password anywhere. |
| Account settings | `src/app/ProfileModal.tsx`, opened from the sidebar profile button. Password change **re-authenticates first** — a valid session alone must never be enough to change the password. |
| Access model | **Flat.** Any authenticated user sees everything. No per-row ownership, no roles. |
| Table policies | Every table: one `ALL` policy, `TO authenticated`, `USING (true)`. **Never `TO public`.** |
| Accounts | Invite-only. `public.auth_allowed_emails` + a `BEFORE INSERT` trigger on `auth.users` (migration `0056`) rejects any address not listed. Add the email there *before* creating the user. |
| Signup toggle | GoTrue's `disable_signup` is **project config, not database** — not reachable via MCP or migrations. The trigger above is the durable backstop; the dashboard toggle is the supported control. Keep both. |

**Storage policies are deliberately asymmetric:**

- `attachments` **SELECT stays public.** Resend and Respond.io fetch quote/invoice/DO PDFs via `getPublicUrl()` to attach them, and customers hold links to documents already sent. Locking reads breaks document delivery.
- `attachments` INSERT / UPDATE / DELETE are `authenticated` — that was the real exposure.
- `backups` is `authenticated`-read, no client write path.

Because every query goes through the one shared client (§3.2), the session JWT is attached automatically — features need no auth code. If a screen suddenly returns empty arrays, check the session before debugging the query.

---

## 22. Edge functions

Eight functions in `supabase/functions/`, all deployed. Each has its own README with the secrets it needs — **secrets are per-function in Supabase**, so the same key must be set separately on each function that uses it.

| Function | Purpose | External | `verify_jwt` |
|---|---|---|---|
| `ai-blogger-draft` | Drafts a post from competitor/keyword context | Anthropic | yes |
| `ai-blogger-publish` | Publishes a draft to Wix Blog v3 | Wix | yes |
| `ai-blogger-seo-snapshot` | Ahrefs metrics for a published URL | Ahrefs | yes |
| `ai-blogger-tick` | Publishes scheduled drafts, refreshes SEO | — | **no** |
| `parse-invoice` | Auto-fills the Bills modal from a dropped file | Anthropic | yes |
| `send-email` | Quote / invoice / PO / DO with PDF attached | Resend | yes |
| `send-whatsapp-quote` | Quotation send (CORS workaround) | Respond.io | yes |
| `snapshot-db` | Nightly DB + attachments backup | — | **no** |

The two `verify_jwt: false` functions authenticate with their own shared secret — **re-deploying either one with the default `verify_jwt: true` breaks it**, because `pg_cron` calls them without a user JWT.

**Snapshots (v2 format).** `snapshot-db` writes a small zip of `manifest.json` + `tables/*.json`, and copies attachments **server-side** to a sibling `voltara-<ts>-attachments/` prefix in the `backups` bucket. Attachment bytes must never pass through the function — buffering them is what exhausted the runtime memory and killed 34 consecutive nightly runs. `scripts/restore-snapshot.ts` reads both v2 and the older v1 (attachments inside the zip).

Only one cron job exists (`voltara-nightly-snapshot`, 18:00 UTC). `ai-blogger-tick` is **not** scheduled despite its README describing a periodic orchestrator.
