-- Helper RPC used by the snapshot-db edge function to enumerate public
-- tables. Keeping this in a SECURITY DEFINER function avoids granting the
-- service_role direct access to information_schema (which it already has,
-- but going through a named RPC is easier to audit).

create or replace function snapshot_list_tables()
returns table(name text)
language sql
security definer
as $$
  select table_name::text
    from information_schema.tables
   where table_schema = 'public' and table_type = 'BASE TABLE'
   order by table_name;
$$;
grant execute on function snapshot_list_tables() to service_role;
