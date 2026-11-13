-- Off the Clock: private storage for reading PDFs attached to assignments.
-- Run once in the Supabase SQL Editor. It does not touch grad_profiles.
-- Files live at <user id>/<assignment id>/<file>. Only the owner can read,
-- add or delete their own files. Nothing is public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('otc-readings', 'otc-readings', false, 52428800, array['application/pdf'])
on conflict (id) do update set public = false, file_size_limit = 52428800, allowed_mime_types = array['application/pdf'];

drop policy if exists "otc_readings_select_own" on storage.objects;
drop policy if exists "otc_readings_insert_own" on storage.objects;
drop policy if exists "otc_readings_delete_own" on storage.objects;

create policy "otc_readings_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'otc-readings' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "otc_readings_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'otc-readings' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "otc_readings_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'otc-readings' and (storage.foldername(name))[1] = (select auth.uid())::text);
