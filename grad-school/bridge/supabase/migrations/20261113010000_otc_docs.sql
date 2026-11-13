-- Off the Clock: outlines, video scripts and notes for assignments, as text and/or a PDF.
-- PDFs go in the private otc-readings bucket (same owner-only folder rules); file_path points there.
-- Owner-only, like grad_profiles. Run once in the Supabase SQL Editor.
-- Does not touch grad_profiles. Text lives only in Kody's private database.
create table if not exists public.otc_docs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  assignment_id text not null check (char_length(assignment_id) between 1 and 100),
  kind text not null default 'outline' check (kind in ('outline','script','notes','draft','other')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 200000),
  file_path text check (file_path is null or char_length(file_path) <= 300),
  file_size bigint,
  file_sha256 text check (file_sha256 is null or file_sha256 ~ '^[0-9a-f]{64}$'),
  author text not null default 'kody' check (author in ('kody','chatgpt','claude')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- If an earlier copy of this table exists without the file columns, add them.
alter table public.otc_docs add column if not exists file_path text;
alter table public.otc_docs add column if not exists file_size bigint;
alter table public.otc_docs add column if not exists file_sha256 text;
create index if not exists otc_docs_user_assignment on public.otc_docs (user_id, assignment_id, updated_at desc);

alter table public.otc_docs enable row level security;
drop policy if exists "otc_docs_select_self" on public.otc_docs;
drop policy if exists "otc_docs_insert_self" on public.otc_docs;
drop policy if exists "otc_docs_update_self" on public.otc_docs;
drop policy if exists "otc_docs_delete_self" on public.otc_docs;
create policy "otc_docs_select_self" on public.otc_docs
for select to authenticated using ((select auth.uid()) = user_id);
create policy "otc_docs_insert_self" on public.otc_docs
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "otc_docs_update_self" on public.otc_docs
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "otc_docs_delete_self" on public.otc_docs
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.otc_docs_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end; $$;
drop trigger if exists otc_docs_touch on public.otc_docs;
create trigger otc_docs_touch before update on public.otc_docs
for each row execute function public.otc_docs_touch();

revoke all on table public.otc_docs from anon;
grant select, insert, update, delete on table public.otc_docs to authenticated;
