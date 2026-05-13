-- AI Blogger: competitor tracking, AI-drafted blog posts, SEO performance over time.

create table blog_competitors (
  id text primary key,
  name text not null,
  website text,
  notes text,
  created_at timestamptz not null default now()
);
alter table blog_competitors enable row level security;
create policy "blog_competitors_all" on blog_competitors for all using (true) with check (true);

create table blog_keywords (
  id text primary key,
  keyword text not null unique,
  intent text,
  priority int not null default 0,
  created_at timestamptz not null default now()
);
alter table blog_keywords enable row level security;
create policy "blog_keywords_all" on blog_keywords for all using (true) with check (true);

create table blog_drafts (
  id text primary key,
  title text not null,
  slug text,
  body_md text not null default '',
  excerpt text,
  cover_image_url text,
  target_keywords text[] not null default '{}',
  competitor_refs text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'approved', 'scheduled', 'publishing', 'published', 'failed')),
  scheduled_at timestamptz,
  published_at timestamptz,
  wix_post_id text,
  wix_post_url text,
  failure_reason text,
  generated_at timestamptz,
  generated_model text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table blog_drafts enable row level security;
create policy "blog_drafts_all" on blog_drafts for all using (true) with check (true);
create index idx_blog_drafts_status on blog_drafts(status);
create index idx_blog_drafts_scheduled_at on blog_drafts(scheduled_at) where status = 'scheduled';

create table blog_seo_snapshots (
  id bigserial primary key,
  draft_id text not null references blog_drafts(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  metrics jsonb not null default '{}'::jsonb
);
alter table blog_seo_snapshots enable row level security;
create policy "blog_seo_snapshots_all" on blog_seo_snapshots for all using (true) with check (true);
create index idx_blog_seo_snapshots_draft on blog_seo_snapshots(draft_id, fetched_at desc);

create table ai_blogger_config (
  id text primary key default 'default',
  brand_voice text,
  target_audience text,
  posting_cadence text not null default 'weekly' check (posting_cadence in ('daily', 'weekly', 'biweekly', 'monthly', 'manual')),
  next_run_at timestamptz,
  autopublish_on_approval boolean not null default false,
  wix_site_id text,
  wix_member_id text,
  default_cover_image_url text,
  updated_at timestamptz not null default now()
);
alter table ai_blogger_config enable row level security;
create policy "ai_blogger_config_all" on ai_blogger_config for all using (true) with check (true);
insert into ai_blogger_config (id) values ('default') on conflict (id) do nothing;
