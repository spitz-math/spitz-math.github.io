-- The Void (dev.spitzmath.com/void): Kody's private idea dump.
-- One table. Only the owner, signed in directly on spitz.dev, can read or write it.
-- Connected AI apps (tokens that carry a client_id, i.e. the Sprite Drop connectors in
-- ChatGPT and Claude) are shut out on purpose: ideas stay put unless Kody copies one out.
-- No due dates, status, or anything that turns an idea into a task.

create table if not exists public.void_ideas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  category    text not null check (category in ('arcade','checkpoint','off-the-clock','spitz-dev','random')),
  body        text not null check (char_length(btrim(body)) between 1 and 8000)
);

create index if not exists void_ideas_user_created on public.void_ideas (user_id, created_at desc);

-- true only for the owner signed in on the dashboard (no client_id, not anonymous)
create or replace function public.void_is_dashboard()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is not null
     and auth.jwt() ->> 'client_id' is null
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

create or replace function public.void_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists void_ideas_touch on public.void_ideas;
create trigger void_ideas_touch before update on public.void_ideas
  for each row execute function public.void_touch();

alter table public.void_ideas enable row level security;
revoke all on public.void_ideas from anon, public;
grant select, insert, update, delete on public.void_ideas to authenticated;

drop policy if exists "void_read_own"   on public.void_ideas;
drop policy if exists "void_insert_own" on public.void_ideas;
drop policy if exists "void_update_own" on public.void_ideas;
drop policy if exists "void_delete_own" on public.void_ideas;
create policy "void_read_own"   on public.void_ideas for select to authenticated using (user_id = (select auth.uid()) and (select public.void_is_dashboard()));
create policy "void_insert_own" on public.void_ideas for insert to authenticated with check (user_id = (select auth.uid()) and (select public.void_is_dashboard()));
create policy "void_update_own" on public.void_ideas for update to authenticated using (user_id = (select auth.uid()) and (select public.void_is_dashboard())) with check (user_id = (select auth.uid()));
create policy "void_delete_own" on public.void_ideas for delete to authenticated using (user_id = (select auth.uid()) and (select public.void_is_dashboard()));
