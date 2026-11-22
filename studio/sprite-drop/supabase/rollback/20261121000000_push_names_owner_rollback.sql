-- Rollback for 20261121000000_push_names_owner.sql: puts back the 2026-11-18 phone trigger (with its "nobody" text).
begin;
drop trigger if exists studio_tasks_notify_new on public.studio_tasks;
drop function if exists public.studio_notify_new_task();
create or replace function public.studio_notify_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  s text;
  who jsonb := '{"spitz":"you","chatgpt_chat":"your ChatGPT chat","openai_worker":"the ChatGPT worker","claude":"the Claude worker","claude_thread":"a Claude thread"}';
  ttl text;
begin
  if not exists (select 1 from public.studio_push_subs where user_id = new.user_id) then return new; end if;
  if tg_op = 'INSERT' then
    ttl := 'New task for ' || coalesce(who ->> new.turn, new.turn, 'nobody');
  elsif new.status is distinct from old.status and new.status = 'done' then
    ttl := 'Done ✓';
  elsif new.status is distinct from old.status and new.status = 'blocked' then
    ttl := 'Blocked, needs you';
  elsif new.turn is distinct from old.turn then
    ttl := case when new.turn = 'spitz' then initcap(coalesce(who ->> old.turn, old.turn, 'someone')) || ' handed it to you'
                when new.turn = 'chatgpt_chat' then 'Waiting on your ChatGPT chat'
                else initcap(coalesce(who ->> old.turn, old.turn, 'someone')) || ' → ' || coalesce(who ->> new.turn, new.turn) end;
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
end $$;
revoke all on function public.studio_notify_phone() from public, anon, authenticated;
drop function if exists public.studio_send_push(uuid, text, text, text);
drop function if exists public.studio_who(text);
drop function if exists public.studio_cap(text);
commit;
