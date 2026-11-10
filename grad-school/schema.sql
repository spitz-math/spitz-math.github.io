-- Run in Supabase SQL Editor for a single-user or multi-user private dashboard.
-- Every record is owned by the authenticated Supabase user and is invisible
-- to unauthenticated visitors and other accounts.
create table if not exists public.grad_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  revision bigint not null default 1,
  data jsonb not null default '{"version":4,"courses":[],"tasks":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint grad_profile_data_object check (jsonb_typeof(data) = 'object')
);

alter table public.grad_profiles add column if not exists revision bigint not null default 1;
alter table public.grad_profiles enable row level security;

-- Ensure a previously created table never retains over-permissive policies.
drop policy if exists "grad_profiles_select_self" on public.grad_profiles;
drop policy if exists "grad_profiles_insert_self" on public.grad_profiles;
drop policy if exists "grad_profiles_update_self" on public.grad_profiles;
drop policy if exists "grad_profiles_delete_self" on public.grad_profiles;

create policy "grad_profiles_select_self" on public.grad_profiles
for select to authenticated using ((select auth.uid()) = user_id);
create policy "grad_profiles_insert_self" on public.grad_profiles
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "grad_profiles_update_self" on public.grad_profiles
for update to authenticated using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "grad_profiles_delete_self" on public.grad_profiles
for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.grad_profiles_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = clock_timestamp();
  new.revision = old.revision + 1;
  return new;
end;
$$;

drop trigger if exists grad_profiles_touch on public.grad_profiles;
create trigger grad_profiles_touch before update on public.grad_profiles
for each row execute function public.grad_profiles_touch_updated_at();

revoke all on table public.grad_profiles from anon;
grant select,insert,update,delete on table public.grad_profiles to authenticated;
