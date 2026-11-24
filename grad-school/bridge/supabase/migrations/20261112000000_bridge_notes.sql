-- Handoff board for the Off the Clock bridge (Claude <-> ChatGPT).
-- Owner-only, like grad_profiles. Run once in the Supabase SQL Editor (or `supabase db push`).
-- Does not touch grad_profiles.
create table if not exists public.bridge_notes (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author text not null check (author in ('claude','chatgpt','kody')),
  kind text not null default 'note' check (kind in ('handoff','task','question','note')),
  area text not null default 'other' check (area in ('look','sync','data','auth','bridge','other')),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 8000),
  status text not null default 'open' check (status in ('open','claimed','done')),
  claimed_by text check (claimed_by in ('claude','chatgpt','kody')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bridge_notes_user_created on public.bridge_notes (user_id, created_at desc);

alter table public.bridge_notes enable row level security;
drop policy if exists "bridge_notes_select_self" on public.bridge_notes;
drop policy if exists "bridge_notes_insert_self" on public.bridge_notes;
drop policy if exists "bridge_notes_update_self" on public.bridge_notes;
drop policy if exists "bridge_notes_delete_self" on public.bridge_notes;
create policy "bridge_notes_select_self" on public.bridge_notes
for select to authenticated using ((select auth.uid()) = user_id);
create policy "bridge_notes_insert_self" on public.bridge_notes
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "bridge_notes_update_self" on public.bridge_notes
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bridge_notes_delete_self" on public.bridge_notes
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.bridge_notes_touch()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = clock_timestamp(); return new; end; $$;
drop trigger if exists bridge_notes_touch on public.bridge_notes;
create trigger bridge_notes_touch before update on public.bridge_notes
for each row execute function public.bridge_notes_touch();

revoke all on table public.bridge_notes from anon;
grant select,insert,update,delete on table public.bridge_notes to authenticated;
