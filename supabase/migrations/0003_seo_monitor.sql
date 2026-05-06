-- ============================================================================
-- Voltara — SEO Monitor schema
-- ============================================================================
-- Self-contained feature: keyword tracking, GSC traffic, page health,
-- backlinks, competitors, alerts, and integration status. No FKs to canonical
-- entities (customers/suppliers/products).
--
-- RLS permissive in v1; tighten when auth lands. Mirrors policy pattern in
-- 0001_init_schema.sql.
-- ============================================================================

create table seo_keywords (
  id text primary key,
  keyword text not null,
  country text not null default 'MY',
  device text not null default 'desktop' check (device in ('desktop','mobile')),
  target_url text,
  is_top boolean not null default false,
  created_at timestamptz not null default now()
);

create table seo_rankings (
  id bigserial primary key,
  keyword_id text not null references seo_keywords(id) on delete cascade,
  source text not null default 'google' check (source in ('google','bing')),
  position int,
  serp_features jsonb,
  captured_at timestamptz not null default now()
);
create index idx_seo_rankings_keyword on seo_rankings(keyword_id, captured_at desc);

create table seo_pages (
  url text primary key,
  indexed boolean,
  status_code int,
  title text,
  meta_description text,
  canonical text,
  lcp_ms int,
  cls numeric(5,3),
  inp_ms int,
  mobile_friendly boolean,
  last_crawled_at timestamptz,
  created_at timestamptz not null default now()
);

create table seo_traffic_daily (
  id bigserial primary key,
  page text not null,
  query text,
  clicks int not null default 0,
  impressions int not null default 0,
  ctr numeric(6,4),
  position numeric(6,2),
  captured_date date not null,
  unique (page, query, captured_date)
);
create index idx_seo_traffic_daily_date on seo_traffic_daily(captured_date desc);

create table seo_backlinks (
  id text primary key,
  source_url text not null,
  target_url text not null,
  anchor text,
  domain_authority numeric(5,2),
  first_seen date,
  last_seen date,
  status text not null default 'active' check (status in ('active','lost','toxic')),
  created_at timestamptz not null default now()
);
create index idx_seo_backlinks_status on seo_backlinks(status);

create table seo_competitors (
  id text primary key,
  domain text not null,
  label text,
  added_at timestamptz not null default now()
);

create table seo_competitor_rankings (
  id bigserial primary key,
  keyword_id text not null references seo_keywords(id) on delete cascade,
  competitor_id text not null references seo_competitors(id) on delete cascade,
  position int,
  captured_at timestamptz not null default now()
);
create index idx_seo_competitor_rankings on seo_competitor_rankings(keyword_id, captured_at desc);

create table seo_alerts (
  id bigserial primary key,
  severity text not null check (severity in ('low','medium','high')),
  type text not null check (type in ('rank_drop','crawl_spike','backlinks_lost','indexing_drop','penalty','cwv_regression')),
  message text not null,
  related jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz
);
create index idx_seo_alerts_open on seo_alerts(created_at desc) where acknowledged_at is null;

create table seo_integrations (
  provider text primary key check (provider in ('gsc','ga4','pagespeed','dataforseo','ahrefs','semrush')),
  status text not null default 'not_connected' check (status in ('not_connected','connected','error')),
  last_sync_at timestamptz,
  last_error text
);

insert into seo_integrations (provider, status) values
  ('gsc',        'not_connected'),
  ('ga4',        'not_connected'),
  ('pagespeed',  'not_connected'),
  ('dataforseo', 'not_connected'),
  ('ahrefs',     'not_connected'),
  ('semrush',    'not_connected');

create or replace view vw_seo_summary as
select
  (select count(*) from seo_pages where indexed is true)                                                       as indexed_pages,
  (select coalesce(round(avg(position)::numeric, 1), 0) from seo_traffic_daily
     where captured_date >= current_date - interval '28 days')                                                 as avg_position_28d,
  (select coalesce(sum(clicks), 0) from seo_traffic_daily
     where captured_date >= current_date - interval '28 days')                                                 as clicks_28d,
  (select count(*) from seo_alerts where acknowledged_at is null)                                              as open_alerts;

create or replace view vw_seo_top_movers as
with latest as (
  select distinct on (keyword_id) keyword_id, position as latest_pos, captured_at
  from seo_rankings
  order by keyword_id, captured_at desc
),
prior as (
  select distinct on (keyword_id) keyword_id, position as prior_pos
  from seo_rankings
  where captured_at < current_date - interval '7 days'
  order by keyword_id, captured_at desc
)
select
  k.id as keyword_id,
  k.keyword,
  l.latest_pos,
  p.prior_pos,
  (p.prior_pos - l.latest_pos) as delta
from seo_keywords k
join latest l on l.keyword_id = k.id
left join prior p on p.keyword_id = k.id
order by abs(coalesce(p.prior_pos - l.latest_pos, 0)) desc;

alter table seo_keywords enable row level security;
alter table seo_rankings enable row level security;
alter table seo_pages enable row level security;
alter table seo_traffic_daily enable row level security;
alter table seo_backlinks enable row level security;
alter table seo_competitors enable row level security;
alter table seo_competitor_rankings enable row level security;
alter table seo_alerts enable row level security;
alter table seo_integrations enable row level security;

create policy "v1 permissive" on seo_keywords for all using (true) with check (true);
create policy "v1 permissive" on seo_rankings for all using (true) with check (true);
create policy "v1 permissive" on seo_pages for all using (true) with check (true);
create policy "v1 permissive" on seo_traffic_daily for all using (true) with check (true);
create policy "v1 permissive" on seo_backlinks for all using (true) with check (true);
create policy "v1 permissive" on seo_competitors for all using (true) with check (true);
create policy "v1 permissive" on seo_competitor_rankings for all using (true) with check (true);
create policy "v1 permissive" on seo_alerts for all using (true) with check (true);
create policy "v1 permissive" on seo_integrations for all using (true) with check (true);
