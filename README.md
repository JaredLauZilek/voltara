# Voltara — Operations Dashboard

Internal SaaS dashboard for Voltara's EV charger sales and operations team. 9 screens — Overview, Invoices, Installations, Customers, Social Media Planner, Sales (quotations & proposals), Purchase Orders, Inventory & Products, Suppliers — backed by Supabase.

> **Read [CLAUDE.md](./CLAUDE.md) before contributing.** It's the design + architecture contract this repo runs on.

## Stack

- **Vite + React 18 + TypeScript**
- **Supabase** (Postgres + REST) for data
- **TanStack Query** for fetching/mutations
- Inline styles via shared `tokens.ts` — no CSS framework

## Setup

### 1. Install

```bash
npm install
```

### 2. Create a Supabase project

- Go to [supabase.com](https://supabase.com) → New project.
- Once it provisions, open **SQL Editor** and run the two migrations **in order**:
  1. Paste the contents of `supabase/migrations/0001_init_schema.sql` → Run.
  2. Paste the contents of `supabase/migrations/0002_seed_data.sql` → Run.
- Open **Project Settings → API** and copy:
  - **Project URL**
  - **anon (public) key**

### 3. Configure env

```bash
cp .env.local.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. (Optional) Regenerate database types

After the migrations run, generate matching TypeScript types:

```bash
SUPABASE_PROJECT_ID=YOUR_PROJECT_REF npm run gen:types
```

(Requires the [Supabase CLI](https://supabase.com/docs/guides/cli).) The repo ships a hand-written `src/shared/lib/database.types.ts` so the project type-checks before you do this — replace it with the generated file when convenient.

### 5. Run

```bash
npm run dev
```

Open `http://localhost:5173`.

## Project layout

See [CLAUDE.md §3](./CLAUDE.md#3-architecture-locked) for the rules. Quick map:

```
src/
├── app/                   shell — sidebar, topbar, screen router
├── shared/                tokens, styles, lib, reusable components
└── features/<name>/       one feature module per screen
    ├── index.ts           public API (only file other features may import)
    ├── api.ts / hooks.ts  data access via Supabase + TanStack Query
    └── <Name>Screen.tsx   the screen
```

Canonical entities — customers, suppliers, products — live in their own features and expose **pickers** (`CustomerPicker`, `SupplierPicker`, `ProductPicker`) used by every transactional modal. So a customer is created once and selected everywhere.

## Extension points

- **`src/features/invoices/pdf/`** — drop your existing PDF-invoice renderer here. See `src/features/invoices/pdf/README.md` for the contract.
- **Whole feature folders** — develop a feature in a separate repo, copy `features/<name>/` in, add a nav/route entry.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Vite dev server. |
| `npm run build` | Type-check then build production bundle. |
| `npm run preview` | Preview the production bundle. |
| `npm run typecheck` | TS type-check only. |
| `npm run gen:types` | Regenerate `src/shared/lib/database.types.ts` from your Supabase project. |
