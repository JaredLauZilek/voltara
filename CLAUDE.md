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
