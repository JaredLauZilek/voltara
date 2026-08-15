-- ============================================================================
-- Close anonymous access: public -> authenticated
-- ============================================================================
-- Every table carried one permissive ALL policy granted to `public`, which
-- includes the `anon` role. Since the anon key ships in the client bundle,
-- anyone who viewed source could read and write all business data directly
-- through PostgREST, bypassing the login screen entirely.
--
-- The row predicate is unchanged (USING true) — this is a flat access model,
-- so the restriction is the *role*, not the row. Policy names are preserved so
-- the mapping back to earlier migrations stays legible.
-- ============================================================================

do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
    execute format(
      'create policy %I on %I.%I for all to authenticated using (true) with check (true)',
      r.policyname, r.schemaname, r.tablename
    );
  end loop;
end $$;

-- ─── Storage ────────────────────────────────────────────────────────────────
-- attachments SELECT deliberately stays public. Resend and Respond.io fetch
-- quote/invoice/DO PDFs from getPublicUrl() to attach them to outgoing mail and
-- WhatsApp, and customers hold links to documents already sent. Locking reads
-- would break document delivery.
--
-- Writes are a different matter: today any holder of the anon key can overwrite
-- or delete every attachment in the bucket. That closes now.
drop policy if exists attachments_insert_all on storage.objects;
create policy attachments_insert_all on storage.objects
  for insert to authenticated with check (bucket_id = 'attachments');

drop policy if exists attachments_update_all on storage.objects;
create policy attachments_update_all on storage.objects
  for update to authenticated using (bucket_id = 'attachments');

drop policy if exists attachments_delete_all on storage.objects;
create policy attachments_delete_all on storage.objects
  for delete to authenticated using (bucket_id = 'attachments');

-- Backups had no policy at all, so the Snapshots screen's download button
-- always failed ("Object not found") — the anon key could not read the bucket.
-- Now that sessions exist, signed-in users can read it. Still no anon access,
-- and still no client-side write path.
drop policy if exists backups_select_authenticated on storage.objects;
create policy backups_select_authenticated on storage.objects
  for select to authenticated using (bucket_id = 'backups');
