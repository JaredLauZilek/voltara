-- ============================================================================
-- Invite-only signup guard
-- ============================================================================
-- The GoTrue "disable signup" toggle lives in project config, not the database,
-- so it can be flipped back on by accident and nothing in this repo would show
-- it. This is the database-level backstop: even with signups enabled, only
-- addresses on the allowlist can ever become users.
--
-- Adding a colleague later = one INSERT into auth_allowed_emails, then they
-- sign up (or you create them) normally.
-- ============================================================================

create table if not exists public.auth_allowed_emails (
  email      text primary key,
  note       text,
  created_at timestamptz not null default now()
);

-- Deliberately NOT covered by the app's RLS policies: no policy is created for
-- this table, and RLS is on, so PostgREST exposes nothing to any client role.
-- Only the service role / SQL editor can read or change it.
alter table public.auth_allowed_emails enable row level security;

insert into public.auth_allowed_emails (email, note)
values ('jared@voltara.com.my', 'Owner — created 2026-08-14')
on conflict (email) do nothing;

create or replace function public.fn_enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not exists (
    select 1 from public.auth_allowed_emails
    where lower(email) = lower(NEW.email)
  ) then
    raise exception 'Signups are invite-only for this application.'
      using errcode = 'check_violation';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_enforce_signup_allowlist on auth.users;
create trigger trg_enforce_signup_allowlist
  before insert on auth.users
  for each row execute function public.fn_enforce_signup_allowlist();
