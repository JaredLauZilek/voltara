-- ============================================================================
-- get_db_stats() — diagnostics RPC used by the System Health screen
-- ============================================================================
-- Returns:
--   {
--     db_bytes: number,
--     tables: [{ name, rows, bytes }],
--     storage_buckets: [{ bucket_id, file_count, total_bytes }]
--   }
--
-- SECURITY DEFINER so the anon role can read pg_catalog / storage internals
-- without granting it those privileges directly.
-- ============================================================================

create or replace function public.get_db_stats()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, storage
as $$
declare
  result jsonb;
begin
  with table_stats as (
    select
      c.relname                                    as name,
      coalesce(s.n_live_tup, 0)::bigint            as rows,
      pg_total_relation_size(c.oid)::bigint        as bytes
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    left join pg_stat_user_tables s on s.relid = c.oid
    where n.nspname = 'public'
      and c.relkind = 'r'
    order by bytes desc
  ),
  bucket_stats as (
    select
      bucket_id,
      count(*)::bigint                                            as file_count,
      coalesce(sum((metadata->>'size')::bigint), 0)::bigint       as total_bytes
    from storage.objects
    group by bucket_id
  )
  select jsonb_build_object(
    'db_bytes', (select pg_database_size(current_database()))::bigint,
    'tables', coalesce(
      (select jsonb_agg(jsonb_build_object('name', name, 'rows', rows, 'bytes', bytes)) from table_stats),
      '[]'::jsonb
    ),
    'storage_buckets', coalesce(
      (select jsonb_agg(jsonb_build_object('bucket_id', bucket_id, 'file_count', file_count, 'total_bytes', total_bytes)) from bucket_stats),
      '[]'::jsonb
    )
  ) into result;
  return result;
end;
$$;

grant execute on function public.get_db_stats() to anon, authenticated;
