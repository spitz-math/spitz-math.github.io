-- Off the Clock: Brightspace calendar sync settings + a text index of PDFs for search.
-- Owner-only, like grad_profiles. Run once in the Supabase SQL Editor. Does not touch grad_profiles.

-- One row per user. brightspace_feed is Kody's private Brightspace calendar link (it carries a token),
-- so it lives only here, never in the repo or the tracker document.
create table if not exists public.otc_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  brightspace_feed text check (brightspace_feed is null or (brightspace_feed ~ '^https://' and char_length(brightspace_feed) <= 1000)),
  time_zone text not null default 'America/Chicago' check (char_length(time_zone) <= 64),
  last_sync jsonb,
  updated_at timestamptz not null default now()
);
alter table public.otc_settings enable row level security;
drop policy if exists "otc_settings_all_self" on public.otc_settings;
create policy "otc_settings_all_self" on public.otc_settings
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.otc_settings from anon;
grant select, insert, update, delete on table public.otc_settings to authenticated;

-- Extracted text of PDFs in the otc-readings bucket, filled by the bridge when it reads a PDF.
create table if not exists public.otc_text (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  path text not null check (char_length(path) <= 300),
  body text not null default '' check (char_length(body) <= 600000),
  pages int,
  updated_at timestamptz not null default now(),
  primary key (user_id, path)
);
alter table public.otc_text enable row level security;
drop policy if exists "otc_text_all_self" on public.otc_text;
create policy "otc_text_all_self" on public.otc_text
for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on table public.otc_text from anon;
grant select, insert, update, delete on table public.otc_text to authenticated;
