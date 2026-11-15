-- Sprite Drop (Spitz.dev test). Run once in the SQL Editor of the NEW Sprite Drop
-- Supabase project. Never run this in the Off the Clock project.
-- Private image storage plus two owner-only tables. Nothing is public.

-- 1. Private bucket: images only, 10 MB each.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('studio-assets', 'studio-assets', false, 10485760, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists "studio_assets_select_own" on storage.objects;
drop policy if exists "studio_assets_insert_own" on storage.objects;
drop policy if exists "studio_assets_delete_own" on storage.objects;

create policy "studio_assets_select_own" on storage.objects
for select to authenticated
using (bucket_id = 'studio-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "studio_assets_insert_own" on storage.objects
for insert to authenticated
with check (bucket_id = 'studio-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "studio_assets_delete_own" on storage.objects
for delete to authenticated
using (bucket_id = 'studio-assets' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 2. One row per saved image.
create table if not exists public.studio_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id text not null check (char_length(task_id) between 1 and 80),
  file_name text not null,
  original_name text,
  mime_type text not null,
  declared_mime text,
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  width integer,
  height integer,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  path text not null unique,
  source text not null check (source in ('file','url','base64')),
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, sha256)
);
alter table public.studio_assets enable row level security;
drop policy if exists "studio_assets_own" on public.studio_assets;
create policy "studio_assets_own" on public.studio_assets
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- 3. Every drop attempt, including failures and the step that failed.
create table if not exists public.studio_drop_log (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id text,
  stage text not null,
  ok boolean not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.studio_drop_log enable row level security;
drop policy if exists "studio_drop_log_own" on public.studio_drop_log;
create policy "studio_drop_log_own" on public.studio_drop_log
for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));
