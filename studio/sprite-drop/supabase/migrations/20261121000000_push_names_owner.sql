-- spitz.dev phone alerts: name the real owner, and flag tasks that truly have no owner.  Kody runs this in the SQL Editor.
--
-- The bug (Kody's phone, 2026-11-20): "New task for nobody" on "Blacksmith props for the Ember Kiln".
-- Cause: since Phase 2 (20261118010000), studio_create_task always inserts the task with NO turn, attaches the
-- references, and only then sets the turn in a second step. The phone trigger fired on the insert, so EVERY new task
-- said "nobody", and the second step sent another alert ("Waiting on your ChatGPT chat", "Someone → a Claude thread").
-- The task itself was routed correctly (it went to Kody's ChatGPT chat and was finished on 2026-11-18).
--
-- The fix:
--   * the new-task alert is sent at COMMIT (a deferred trigger), when the turn has been set, so it names the real owner:
--     "New task for the ChatGPT worker", "New task for a Claude thread", ...
--   * the "turn set while creating" step no longer sends a second alert.
--   * a task that is still ownerless at commit is FLAGGED, not blocked: "New task with no owner" + "nobody will start it,
--     pick who does it". (Blocking would break the reference lifecycle, which lets a task sit unassigned while
--     references are attached.) A later hand-off to nobody is flagged the same way.
--   * names keep their capitals ("The ChatGPT worker handed it to you", not "The Chatgpt Worker").
-- Rollback: ../rollback/20261121000000_push_names_owner_rollback.sql

begin;

-- Refuse to replace a phone trigger that is not the one this was written against (so no unseen live change is lost).
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                  where n.nspname = 'public' and p.proname = 'studio_notify_phone'
                    and p.prosrc like '%new.turn, ''nobody''%' and p.prosrc like '%Waiting on your ChatGPT chat%') then
    raise exception 'studio_notify_phone is not the 2026-11-18 version this fix expects. Nothing was changed.';
  end if;
end $$;

-- who has the task, in words
create or replace function public.studio_who(p_turn text)
returns text language sql immutable set search_path = '' as $$
  select case p_turn when 'spitz' then 'you' when 'chatgpt_chat' then 'your ChatGPT chat'
    when 'openai_worker' then 'the ChatGPT worker' when 'claude' then 'the Claude worker'
    when 'claude_thread' then 'a Claude thread' else p_turn end
$$;
create or replace function public.studio_cap(p text)
returns text language sql immutable set search_path = '' as $$ select upper(left(p, 1)) || substr(p, 2) $$;
revoke all on function public.studio_who(text), public.studio_cap(text) from public, anon;

create or replace function public.studio_send_push(p_user uuid, p_title text, p_body text, p_tag text)
returns void language plpgsql security definer set search_path = '' as $$
declare s text;
begin
  if not exists (select 1 from public.studio_push_subs where user_id = p_user) then return; end if;
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  if s is null then return; end if;
  perform net.http_post(
    url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
    body := jsonb_build_object('user_id', p_user, 'title', p_title, 'body', p_body, 'tag', p_tag),
    timeout_milliseconds := 5000);
end $$;
revoke all on function public.studio_send_push(uuid, text, text, text) from public, anon, authenticated;

-- hand-offs, blocks and finishes (new tasks are handled at commit, below)
create or replace function public.studio_notify_phone()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ttl text; msg text := new.title;
begin
  if tg_op = 'INSERT' then return new; end if;
  if new.status is distinct from old.status and new.status = 'done' then
    ttl := 'Done ✓';
  elsif new.status is distinct from old.status and new.status = 'blocked' then
    ttl := 'Blocked, needs you';
  elsif new.turn is distinct from old.turn then
    -- the turn being set inside the create call: the new-task alert at commit already names the owner
    if old.turn is null and new.created_at = now() then return new; end if;
    if new.turn is null then
      if new.status <> 'open' then return new; end if;
      ttl := 'No owner now'; msg := new.title || '. Nobody will start it: open spitz.dev and pick who does it.';
    elsif new.turn = 'chatgpt_chat' then ttl := 'Waiting on your ChatGPT chat';
    elsif new.turn = 'spitz' then ttl := coalesce(public.studio_cap(public.studio_who(old.turn)) || ' handed it to you', 'Handed to you');
    else ttl := coalesce(public.studio_cap(public.studio_who(old.turn)) || ' → ' || public.studio_who(new.turn),
                         'Handed to ' || public.studio_who(new.turn));
    end if;
  else
    return new;
  end if;
  perform public.studio_send_push(new.user_id, ttl, msg, new.id::text);
  return new;
end $$;
revoke all on function public.studio_notify_phone() from public, anon, authenticated;

-- new task: runs at commit, so it sees the owner the create call set
create or replace function public.studio_notify_new_task()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks;
begin
  select * into t from public.studio_tasks where id = new.id;
  if not found then return null; end if;
  if t.turn is null and t.status = 'open' then
    perform public.studio_send_push(t.user_id, 'New task with no owner',
      t.title || '. Nobody will start it: open spitz.dev and pick who does it.', t.id::text);
  elsif t.turn is not null then
    perform public.studio_send_push(t.user_id, 'New task for ' || public.studio_who(t.turn), t.title, t.id::text);
  end if;
  return null;
end $$;
revoke all on function public.studio_notify_new_task() from public, anon, authenticated;

drop trigger if exists studio_tasks_notify_new on public.studio_tasks;
create constraint trigger studio_tasks_notify_new after insert on public.studio_tasks
  deferrable initially deferred for each row execute function public.studio_notify_new_task();

commit;
