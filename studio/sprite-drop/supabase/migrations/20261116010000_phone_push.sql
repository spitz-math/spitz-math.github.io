-- spitz.dev: phone notifications from the dashboard itself (Web Push, so they show the burger icon).
-- Kody adds dev.spitzmath.com to the home screen and taps the bell; the browser's push subscription is saved here.
-- Every new task, hand-off, block and finish calls the push-notify edge function, which sends to the task owner's phones.
-- The VAPID key pair is made by the edge function on its first call and kept in Vault. Applied 2026-11-16.

create table if not exists public.studio_push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  sub jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.studio_push_subs enable row level security;
revoke all on public.studio_push_subs from anon, authenticated;

-- dashboard: save (or refresh) this device's subscription
create or replace function public.studio_save_push(p_sub jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if coalesce(p_sub ->> 'endpoint', '') !~ '^https://' or p_sub -> 'keys' ->> 'p256dh' is null or p_sub -> 'keys' ->> 'auth' is null then
    raise exception 'Not a push subscription' using errcode = '22023';
  end if;
  insert into public.studio_push_subs (endpoint, user_id, sub) values (p_sub ->> 'endpoint', auth.uid(), p_sub)
  on conflict (endpoint) do update set user_id = excluded.user_id, sub = excluded.sub, created_at = now();
  return jsonb_build_object('saved', true);
end;
$$;
revoke all on function public.studio_save_push(jsonb) from public, anon;
grant execute on function public.studio_save_push(jsonb) to authenticated;

-- VAPID keys: made once by the edge function itself and kept in Vault, so no key ever passes through a chat.
create or replace function public.studio_vapid_private()
returns text
language sql
security definer
set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private' $$;
revoke all on function public.studio_vapid_private() from public, anon, authenticated;
grant execute on function public.studio_vapid_private() to service_role;

create or replace function public.studio_vapid_save(p_public text, p_private text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from vault.secrets where name = 'vapid_private') then return false; end if;
  perform vault.create_secret(p_private, 'vapid_private', 'VAPID private key for spitz.dev phone notifications');
  perform vault.create_secret(p_public, 'vapid_public', 'VAPID public key for spitz.dev phone notifications');
  return true;
end;
$$;
revoke all on function public.studio_vapid_save(text, text) from public, anon, authenticated;
grant execute on function public.studio_vapid_save(text, text) to service_role;

-- dashboard: the public key it subscribes with (public by design)
create or replace function public.studio_vapid_public()
returns text
language sql
security definer
set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public' $$;
revoke all on function public.studio_vapid_public() from public, anon;
grant execute on function public.studio_vapid_public() to authenticated, service_role;

create or replace function public.studio_notify_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  s text;
  who jsonb := '{"chatgpt":"ChatGPT","claude":"Claude","kody":"you"}';
  ttl text;
begin
  if not exists (select 1 from public.studio_push_subs where user_id = new.user_id) then return new; end if;
  if tg_op = 'INSERT' then
    ttl := 'New task for ' || coalesce(who ->> new.turn, new.turn);
  elsif new.status is distinct from old.status and new.status = 'done' then
    ttl := 'Done ✓';
  elsif new.status is distinct from old.status and new.status = 'blocked' then
    ttl := 'Blocked, needs you';
  elsif new.turn is distinct from old.turn then
    ttl := case when new.turn = 'kody' then coalesce(who ->> old.turn, old.turn) || ' handed it to you'
                else coalesce(who ->> old.turn, old.turn) || ' → ' || coalesce(who ->> new.turn, new.turn) end;
  else
    return new;
  end if;
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  perform net.http_post(
    url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
    body := jsonb_build_object('user_id', new.user_id, 'title', ttl, 'body', new.title, 'tag', new.id::text),
    timeout_milliseconds := 5000);
  return new;
end;
$$;
revoke all on function public.studio_notify_phone() from public, anon, authenticated;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'studio_tasks_notify_phone') then
    create trigger studio_tasks_notify_phone after insert or update on public.studio_tasks
      for each row execute function public.studio_notify_phone();
  end if;
end $$;
