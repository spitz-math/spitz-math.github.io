-- spitz.dev Phase 1: five worker identities and safe routing.  NOT APPLIED until Kody's deploy go-ahead.
--
-- Identities (turn, author, created_by all use these five):
--   spitz          Kody (human owner). Never auto-runs.               verified: dashboard sign-in (no OAuth client)
--   chatgpt_chat   Kody's interactive ChatGPT. Never auto-runs.       verified: chatgpt.com OAuth app
--   openai_worker  automated OpenAI API worker. Auto-runs.            verified: service-role studio_worker_post only
--   claude         automated Claude worker routine. Auto-runs.        claude.ai OAuth app + DECLARED "as"
--   claude_thread  interactive Claude project thread. Never auto-runs. claude.ai OAuth app + DECLARED "as"
-- Limitation (documented, not hidden): the Claude worker and Claude threads sign in through the same claude.ai
-- app, so the server cannot tell them apart. They must declare which one they are; author_app records what the
-- server actually verified ('claude.ai'), so the declared half is visible as unverified.
--
-- Routing changes:
--   * only turn = openai_worker wakes the API worker, and only when the task ARRIVES there (insert, turn change,
--     or reopen). Notes on a task that already sits there no longer start another run (the duplicate-run bug).
--   * only turn = claude wakes the Claude routine (unchanged). claude_thread wakes nobody.
--   * the old values 'kody' and 'chatgpt' are refused with an explanation.
--
-- History: every renamed value is logged in studio_identity_renames (table, row, column, old, new), so the
-- rollback script can restore the exact old values. No message body, seq, timestamp or ownership changes.
--   kody -> spitz everywhere.
--   tasks.turn chatgpt -> chatgpt_chat (open tasks must not start auto-running by surprise).
--   tasks.created_by chatgpt -> chatgpt_chat (only the chatgpt.com app could create tasks).
--   messages.author chatgpt -> openai_worker when request_key starts 'worker-' (the worker's only key format),
--                              otherwise chatgpt_chat.
--   messages.set_turn chatgpt -> openai_worker (at the time, that handoff did start the API worker).
--   run_events.actor chatgpt -> chatgpt_chat for 'read' events (written by the chatgpt.com app), else openai_worker.
--   run_events.actor kody -> spitz.

begin;

-- 0. Refuse to run while an API worker run is live, so no in-flight run is cut over mid-step.
do $$ begin
  if exists (select 1 from public.studio_worker_runs where status = 'started' and coalesce(heartbeat_at, created_at) > now() - interval '5 minutes') then
    raise exception 'An API worker run is still active. Wait for it to finish, then apply this migration.';
  end if;
end $$;

-- 1. Rename log (also the rollback source).
create table if not exists public.studio_identity_renames (
  tbl text not null, row_id text not null, col text not null, old_value text not null, new_value text not null,
  at timestamptz not null default now(), primary key (tbl, row_id, col));
alter table public.studio_identity_renames enable row level security;

-- 2. No triggers fire while history is rewritten (no wakes, no phone pushes).
alter table public.studio_tasks disable trigger user;

alter table public.studio_tasks drop constraint if exists studio_tasks_turn_check;
alter table public.studio_tasks drop constraint if exists studio_tasks_created_by_check;
alter table public.studio_messages drop constraint if exists studio_messages_author_check;
alter table public.studio_messages drop constraint if exists studio_messages_set_turn_check;

-- 3. Rewrite values, logging each one first.
insert into public.studio_identity_renames (tbl, row_id, col, old_value, new_value)
select 'studio_tasks', id::text, 'turn', turn, case turn when 'kody' then 'spitz' else 'chatgpt_chat' end
  from public.studio_tasks where turn in ('kody', 'chatgpt')
union all
select 'studio_tasks', id::text, 'created_by', created_by, case created_by when 'kody' then 'spitz' else 'chatgpt_chat' end
  from public.studio_tasks where created_by in ('kody', 'chatgpt')
union all
select 'studio_messages', id::text, 'author', author,
       case when author = 'kody' then 'spitz' when request_key like 'worker-%' then 'openai_worker' else 'chatgpt_chat' end
  from public.studio_messages where author in ('kody', 'chatgpt')
union all
select 'studio_messages', id::text, 'set_turn', set_turn, case set_turn when 'kody' then 'spitz' else 'openai_worker' end
  from public.studio_messages where set_turn in ('kody', 'chatgpt')
union all
select 'studio_run_events', id::text, 'actor', actor,
       case when actor = 'kody' then 'spitz' when kind = 'read' then 'chatgpt_chat' else 'openai_worker' end
  from public.studio_run_events where actor in ('kody', 'chatgpt');

update public.studio_tasks t set turn = r.new_value from public.studio_identity_renames r
 where r.tbl = 'studio_tasks' and r.col = 'turn' and r.row_id = t.id::text;
update public.studio_tasks t set created_by = r.new_value from public.studio_identity_renames r
 where r.tbl = 'studio_tasks' and r.col = 'created_by' and r.row_id = t.id::text;
update public.studio_messages m set author = r.new_value from public.studio_identity_renames r
 where r.tbl = 'studio_messages' and r.col = 'author' and r.row_id = m.id::text;
update public.studio_messages m set set_turn = r.new_value from public.studio_identity_renames r
 where r.tbl = 'studio_messages' and r.col = 'set_turn' and r.row_id = m.id::text;
update public.studio_run_events e set actor = r.new_value from public.studio_identity_renames r
 where r.tbl = 'studio_run_events' and r.col = 'actor' and r.row_id = e.id::text;

-- 4. What the server actually verified, next to the identity.
alter table public.studio_messages add column if not exists author_app text;
alter table public.studio_tasks add column if not exists created_by_app text;
update public.studio_messages set author_app = case author when 'spitz' then 'dashboard' when 'chatgpt_chat' then 'chatgpt.com'
  when 'openai_worker' then 'api_worker' else 'claude.ai' end where author_app is null;
update public.studio_tasks set created_by_app = case created_by when 'spitz' then 'dashboard' when 'chatgpt_chat' then 'chatgpt.com'
  when 'openai_worker' then 'api_worker' else 'claude.ai' end where created_by_app is null;
alter table public.studio_messages alter column author_app set not null;
alter table public.studio_tasks alter column created_by_app set not null;

alter table public.studio_tasks add constraint studio_tasks_turn_check
  check (turn in ('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'));
alter table public.studio_tasks add constraint studio_tasks_created_by_check
  check (created_by in ('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'));
alter table public.studio_messages add constraint studio_messages_set_turn_check
  check (set_turn in ('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'));
alter table public.studio_messages add constraint studio_messages_author_check
  check (author in ('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'));
-- the declared identity must belong to the verified app
alter table public.studio_messages add constraint studio_messages_author_app_check check (
     (author_app = 'dashboard' and author = 'spitz') or (author_app = 'chatgpt.com' and author = 'chatgpt_chat')
  or (author_app = 'api_worker' and author = 'openai_worker') or (author_app = 'claude.ai' and author in ('claude', 'claude_thread')));
alter table public.studio_tasks add constraint studio_tasks_created_by_app_check check (
     (created_by_app = 'dashboard' and created_by = 'spitz') or (created_by_app = 'chatgpt.com' and created_by = 'chatgpt_chat')
  or (created_by_app = 'api_worker' and created_by = 'openai_worker') or (created_by_app = 'claude.ai' and created_by in ('claude', 'claude_thread')));

alter table public.studio_tasks enable trigger user;

-- 5. Identity helpers.
-- The verified app: 'dashboard' (Kody signed in directly), 'claude.ai' or 'chatgpt.com'.
create or replace function public.studio_current_app()
returns text language plpgsql stable security definer set search_path = '' as $$
declare cid uuid; uris text; hosts text[];
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode = '28000'; end if;
  begin cid := (auth.jwt() ->> 'client_id')::uuid; exception when others then cid := null; end;
  if cid is null then
    if auth.jwt() ->> 'client_id' is not null then raise exception 'Unreadable client_id in the token' using errcode = '28000'; end if;
    if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then raise exception 'Anonymous sessions cannot use Task Drop' using errcode = '28000'; end if;
    return 'dashboard';
  end if;
  select c.redirect_uris into uris from auth.oauth_clients c
   where c.id = cid and c.deleted_at is null
     and exists (select 1 from auth.oauth_consents o where o.client_id = c.id and o.user_id = auth.uid() and o.revoked_at is null);
  if uris is null then raise exception 'This app is not approved for this account' using errcode = '28000'; end if;
  select array_agg(distinct substring(u from '^https://([^/:]+)')) into hosts
    from regexp_split_to_table(trim(uris), '[,[:space:]]+') as u where u <> '';
  if hosts = array['claude.ai'] then return 'claude.ai'; end if;
  if hosts = array['chatgpt.com'] then return 'chatgpt.com'; end if;
  raise exception 'Unknown app (returns to %). Ask Claude to add it before it can use Task Drop.', array_to_string(hosts, ', ') using errcode = '28000';
end $$;

-- The identity for this call. Claude apps must declare claude or claude_thread (unverifiable, recorded as declared).
create or replace function public.studio_resolve_author(p_as text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare app text := public.studio_current_app();
begin
  if app = 'dashboard' then
    if p_as is not null and p_as <> 'spitz' then raise exception 'The dashboard always posts as spitz' using errcode = '22023'; end if;
    return 'spitz';
  elsif app = 'chatgpt.com' then
    if p_as is not null and p_as <> 'chatgpt_chat' then raise exception 'ChatGPT through this connector is chatgpt_chat' using errcode = '22023'; end if;
    return 'chatgpt_chat';
  end if;
  if p_as in ('claude', 'claude_thread') then return p_as; end if;
  raise exception 'Say who you are with "as": "claude" for the automated Claude worker, "claude_thread" for a Claude project thread. The server cannot check this, so it is recorded as declared.' using errcode = '22023';
end $$;

-- Kept for older callers (list_tasks "me", read events): returns the identity, using the declared one when given.
create or replace function public.studio_current_agent(p_as text default null)
returns text language plpgsql stable security definer set search_path = '' as $$
declare app text := public.studio_current_app();
begin
  if app = 'dashboard' then return 'spitz'; end if;
  if app = 'chatgpt.com' then return 'chatgpt_chat'; end if;
  if p_as in ('claude', 'claude_thread') then return p_as; end if;
  return 'claude';
end $$;
drop function if exists public.studio_current_agent();

create or replace function public.studio_check_turn(p_turn text)
returns void language plpgsql immutable set search_path = '' as $$
begin
  if p_turn is null then return; end if;
  if p_turn = 'kody' then raise exception 'The owner is now "spitz". Use turn spitz.' using errcode = '22023'; end if;
  if p_turn = 'chatgpt' then raise exception '"chatgpt" was split in two: use "chatgpt_chat" for Kody''s ChatGPT chat (never starts by itself) or "openai_worker" for the automatic API worker.' using errcode = '22023'; end if;
  if p_turn not in ('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread') then
    raise exception 'Unknown turn "%". Use spitz, chatgpt_chat, openai_worker, claude or claude_thread.', p_turn using errcode = '22023';
  end if;
end $$;

-- Lets the dashboard detect which identity scheme the database speaks.
create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;

-- 6. Task Drop entry points (new optional p_as; old calls without it still resolve for dashboard and ChatGPT).
drop function if exists public.studio_create_task(text, text, text, text, text, jsonb);
create function public.studio_create_task(p_request_key text, p_project text, p_title text, p_brief text,
  p_turn text default null, p_refs jsonb default '[]', p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me text := public.studio_resolve_author(p_as);
  app text := public.studio_current_app();
  uid uuid := auth.uid();
  t public.studio_tasks;
begin
  perform public.studio_check_turn(p_turn);
  select * into t from public.studio_tasks where user_id = uid and request_key = p_request_key;
  if found then
    if t.project <> p_project or t.title <> p_title then
      raise exception 'request_key % was already used for a different task', p_request_key using errcode = '22023';
    end if;
    return jsonb_build_object('duplicate', true, 'task', to_jsonb(t));
  end if;
  insert into public.studio_tasks (user_id, project, title, brief, turn, created_by, created_by_app, refs, request_key)
  values (uid, p_project, p_title, p_brief, p_turn, me, app, public.studio_check_refs(p_refs), p_request_key)
  on conflict (user_id, request_key) do nothing
  returning * into t;
  if t.id is null then
    select * into t from public.studio_tasks where user_id = uid and request_key = p_request_key;
    return jsonb_build_object('duplicate', true, 'task', to_jsonb(t));
  end if;
  return jsonb_build_object('duplicate', false, 'task', to_jsonb(t));
end $$;

drop function if exists public.studio_post_message(uuid, text, text, text, jsonb, text, text, integer);
create function public.studio_post_message(p_task_id uuid, p_request_key text, p_kind text, p_body text,
  p_refs jsonb default '[]', p_set_status text default null, p_set_turn text default null,
  p_expected_version integer default null, p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me text := public.studio_resolve_author(p_as);
  app text := public.studio_current_app();
  uid uuid := auth.uid();
  t public.studio_tasks;
  m public.studio_messages;
  changes boolean := p_set_status is not null or p_set_turn is not null;
  next_seq integer;
begin
  perform public.studio_check_turn(p_set_turn);
  select * into m from public.studio_messages where user_id = uid and request_key = p_request_key;
  if found then
    if m.task_id <> p_task_id then
      raise exception 'request_key % was already used on another task', p_request_key using errcode = '22023';
    end if;
    select * into t from public.studio_tasks where id = m.task_id;
    return jsonb_build_object('duplicate', true, 'message', to_jsonb(m), 'task', to_jsonb(t));
  end if;
  select * into t from public.studio_tasks where id = p_task_id and user_id = uid for update;
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  if changes and (p_expected_version is null or p_expected_version <> t.version) then
    return jsonb_build_object('conflict', true,
      'reason', case when p_expected_version is null then 'expected_version is required to change status or turn'
                     else 'the task changed since you read it' end,
      'task', to_jsonb(t));
  end if;
  select coalesce(max(seq), 0) + 1 into next_seq from public.studio_messages where task_id = t.id;
  insert into public.studio_messages (task_id, user_id, seq, author, author_app, kind, body, refs, set_status, set_turn, request_key)
  values (t.id, uid, next_seq, me, app, p_kind, p_body, public.studio_check_refs(p_refs), p_set_status, p_set_turn, p_request_key)
  returning * into m;
  update public.studio_tasks
     set status = coalesce(p_set_status, status),
         turn = case when p_set_turn is not null then p_set_turn else turn end,
         version = version + 1, updated_at = now()
   where id = t.id
  returning * into t;
  return jsonb_build_object('duplicate', false, 'message', to_jsonb(m), 'task', to_jsonb(t));
end $$;

create or replace function public.studio_worker_post(p_task_id uuid, p_request_key text, p_kind text, p_body text,
  p_refs jsonb default '[]', p_set_status text default null, p_set_turn text default null, p_expected_version integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks; m public.studio_messages; r jsonb; next_seq integer;
begin
  perform public.studio_check_turn(p_set_turn);
  if p_set_turn = 'openai_worker' then raise exception 'The API worker cannot hand a task to itself' using errcode = '22023'; end if;
  select * into t from public.studio_tasks where id = p_task_id for update;
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  select * into m from public.studio_messages where user_id = t.user_id and request_key = p_request_key;
  if found then return jsonb_build_object('duplicate', true, 'message', to_jsonb(m), 'task', to_jsonb(t)); end if;
  if (p_set_status is not null or p_set_turn is not null) and (p_expected_version is null or p_expected_version <> t.version) then
    return jsonb_build_object('conflict', true, 'reason', 'the task changed since the worker read it', 'task', to_jsonb(t));
  end if;
  if jsonb_typeof(coalesce(p_refs, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_refs, '[]'::jsonb)) > 20 then
    raise exception 'refs must be a list of at most 20 items' using errcode = '22023';
  end if;
  for r in select * from jsonb_array_elements(coalesce(p_refs, '[]'::jsonb)) loop
    if r ->> 'type' <> 'asset' or not exists (select 1 from public.studio_assets a where a.id::text = r ->> 'id' and a.user_id = t.user_id) then
      raise exception 'The worker can only reference this owner''s assets' using errcode = '22023';
    end if;
  end loop;
  select coalesce(max(seq), 0) + 1 into next_seq from public.studio_messages where task_id = t.id;
  insert into public.studio_messages (task_id, user_id, seq, author, author_app, kind, body, refs, set_status, set_turn, request_key)
  values (t.id, t.user_id, next_seq, 'openai_worker', 'api_worker', p_kind, p_body, coalesce(p_refs, '[]'::jsonb), p_set_status, p_set_turn, p_request_key)
  returning * into m;
  update public.studio_tasks
     set status = coalesce(p_set_status, status),
         turn = case when p_set_turn is not null then p_set_turn else turn end,
         version = version + 1, updated_at = now()
   where id = t.id
  returning * into t;
  return jsonb_build_object('duplicate', false, 'message', to_jsonb(m), 'task', to_jsonb(t));
end $$;

-- 7. Wakes.
create or replace function public.studio_tasks_wake_worker()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- only when the task ARRIVES on openai_worker (or is reopened there); a note on a task already there wakes nobody
  if new.turn = 'openai_worker' and new.status = 'open'
     and (tg_op = 'INSERT' or old.turn is distinct from new.turn or old.status is distinct from new.status) then
    perform public.studio_wake_worker_now(new.id);
  end if;
  return new;
end $$;

create or replace function public.studio_wake_worker(p_task_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks;
begin
  select * into t from public.studio_tasks where id = p_task_id and user_id = auth.uid();
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  if t.turn <> 'openai_worker' or t.status <> 'open' then
    return jsonb_build_object('woken', false, 'reason', 'It is not the API worker''s turn on this task.');
  end if;
  if exists (select 1 from public.studio_worker_runs x where x.task_id = t.id and x.status = 'started' and coalesce(x.heartbeat_at, x.created_at) > now() - interval '50 seconds') then
    return jsonb_build_object('woken', false, 'reason', 'The API worker is already working on this task.');
  end if;
  perform public.studio_wake_worker_now(t.id);
  return jsonb_build_object('woken', true);
end $$;

create or replace function public.studio_wake_worker_now(p_task_id uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare s text; rid bigint;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  rid := net.http_post(
    url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/chatgpt-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
    body := jsonb_build_object('task_id', p_task_id),
    timeout_milliseconds := 5000);
  perform public.studio_log_event(p_task_id, null, 'openai_worker', 'wake', 'Wake request sent to the OpenAI API worker', rid);
  return rid;
end $$;

-- 8. Labels, alerts, views and run housekeeping that named the old values.
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

create or replace function public.studio_alert_stuck_tasks()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  t record; s text; n integer := 0;
  who jsonb := '{"openai_worker":"the ChatGPT worker","claude":"the Claude worker"}';
  send_alert boolean; ttl text; msg text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  if s is null then return 0; end if;
  for t in
    select tk.id, tk.version, tk.turn, tk.title, tk.user_id, tk.updated_at,
           (select max(w.created_at) from public.studio_claude_wakes w join net._http_response r on r.id = w.request_id
             where w.task_id = tk.id and w.task_version = tk.version and r.status_code between 200 and 299) as woke_at,
           (select count(*) from public.studio_messages m
             where m.task_id = tk.id and m.set_turn in ('openai_worker', 'claude')
               and m.seq > coalesce((select max(k.seq) from public.studio_messages k where k.task_id = tk.id and k.author = 'spitz'), 0)) as handoffs
      from public.studio_tasks tk
     where tk.status = 'open' and tk.turn in ('openai_worker', 'claude')
  loop
    send_alert := false;
    if not exists (select 1 from public.studio_stuck_alerts a where a.task_id = t.id and a.task_version = t.version) then
      if t.turn = 'claude' and t.woke_at is not null and t.woke_at < now() - interval '10 minutes' and t.updated_at <= t.woke_at then
        send_alert := true;
        ttl := 'Claude was woken but hasn''t answered';
        msg := t.title || '. Its Sprite Drop sign-in may have expired: reconnect it in Claude, then open the dashboard.';
      elsif t.updated_at < now() - interval '30 minutes' then
        send_alert := true;
        ttl := 'Stuck: ' || coalesce(who ->> t.turn, t.turn) || '''s turn for 30+ min';
        msg := t.title || '. Check the ' || case when t.turn = 'claude' then 'Sprite Drop connector in Claude' else 'ChatGPT worker' end || ', or open the dashboard.';
      end if;
      if send_alert then insert into public.studio_stuck_alerts (task_id, task_version) values (t.id, t.version) on conflict do nothing; end if;
    end if;
    if not send_alert and t.handoffs >= 8
       and not exists (select 1 from public.studio_stuck_alerts a where a.task_id = t.id and a.task_version = 0) then
      send_alert := true;
      ttl := 'Going back and forth: ' || t.handoffs || ' hand-offs';
      msg := t.title || '. The workers keep passing it without finishing. Open the dashboard and decide.';
      insert into public.studio_stuck_alerts (task_id, task_version) values (t.id, 0) on conflict do nothing;
    end if;
    if send_alert then
      perform net.http_post(
        url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/push-notify',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
        body := jsonb_build_object('user_id', t.user_id, 'title', ttl, 'body', msg, 'tag', 'stuck-' || t.id::text),
        timeout_milliseconds := 5000);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;

create or replace function public.studio_now()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'tasks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'wake', (select jsonb_build_object('at', w.created_at, 'version', w.task_version, 'code', r.status_code, 'waiting', r.id is null)
                   from public.studio_claude_wakes w left join net._http_response r on r.id = w.request_id
                  where w.task_id = t.id order by w.created_at desc limit 1),
        'run', (select jsonb_build_object('id', x.id, 'status', x.status, 'version', x.task_version, 'at', x.created_at, 'finished', x.finished_at,
                         'detail', left(x.detail, 300), 'step', x.step, 'heartbeat', x.heartbeat_at, 'part_started', x.part_started_at,
                         'pictures', coalesce(jsonb_array_length(x.plan -> 'images'), 0), 'saved', jsonb_array_length(x.done_assets), 'error_kind', x.error_kind)
                  from public.studio_worker_runs x where x.task_id = t.id order by x.id desc limit 1),
        'gptwake', (select jsonb_build_object('at', e.at, 'code', r.status_code, 'waiting', r.id is null, 'error', left(r.error_msg, 200))
                      from public.studio_run_events e left join net._http_response r on r.id = e.request_id
                     where e.task_id = t.id and e.actor = 'openai_worker' and e.kind = 'wake' order by e.at desc limit 1),
        'read', (select jsonb_object_agg(z.actor, z.at) from (select e.actor, max(e.at) as at from public.studio_run_events e
                   where e.task_id = t.id and e.kind = 'read' and e.task_version = t.version group by e.actor) z),
        'last_event', (select jsonb_build_object('at', e.at, 'actor', e.actor, 'kind', e.kind, 'detail', e.detail)
                         from public.studio_run_events e where e.task_id = t.id order by e.at desc limit 1),
        'handoffs', (select count(*) from public.studio_messages m
                      where m.task_id = t.id and m.set_turn in ('openai_worker', 'claude')
                        and m.seq > coalesce((select max(k.seq) from public.studio_messages k where k.task_id = t.id and k.author = 'spitz'), 0))))
        from public.studio_tasks t where t.user_id = auth.uid() and t.status <> 'done'), '[]'::jsonb),
    'health', jsonb_build_object(
      'phones', (select count(*) from public.studio_push_subs where user_id = auth.uid()),
      'last_push', (select jsonb_build_object('at', r.created, 'code', r.status_code)
                      from net._http_response r where r.content like '{"sent":%' order by r.id desc limit 1),
      'jobs', (select jsonb_agg(jsonb_build_object('job', j.jobname, 'at', d.end_time, 'ok', d.status = 'succeeded'))
                 from cron.job j
                 left join lateral (select end_time, status from cron.job_run_details where jobid = j.jobid order by runid desc limit 1) d on true
                where j.jobname like 'studio-%'))
  )
  where auth.uid() is not null
$$;

create or replace function public.studio_note_read(p_task_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks; a text;
begin
  select * into t from public.studio_tasks where id = p_task_id and user_id = auth.uid();
  if not found then return; end if;
  begin a := public.studio_current_agent(null); exception when others then a := null; end;
  if a is null then return; end if;
  if exists (select 1 from public.studio_run_events e where e.task_id = t.id and e.actor = a and e.kind = 'read' and e.task_version = t.version) then return; end if;
  insert into public.studio_run_events (task_id, user_id, task_version, actor, kind, detail)
  values (t.id, t.user_id, t.version, a, 'read', 'Opened the task');
end $$;

create or replace function public.studio_retry_run(p_run_id bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.studio_worker_runs; t public.studio_tasks;
begin
  select * into r from public.studio_worker_runs where id = p_run_id and user_id = auth.uid();
  if not found then raise exception 'No run %', p_run_id using errcode = '22023'; end if;
  select * into t from public.studio_tasks where id = r.task_id;
  if r.status not in ('stalled', 'error') then return jsonb_build_object('retried', false, 'reason', 'That run is not stopped.'); end if;
  if exists (select 1 from public.studio_worker_runs x where x.task_id = r.task_id and x.status = 'started' and x.heartbeat_at > now() - interval '50 seconds') then
    return jsonb_build_object('retried', false, 'reason', 'The ChatGPT worker is already working on this task.');
  end if;
  if t.status <> 'open' or t.turn <> 'openai_worker' then
    return jsonb_build_object('retried', false, 'reason', 'Hand the task back to the ChatGPT worker first.');
  end if;
  if r.plan is not null then
    update public.studio_worker_runs
       set status = 'started', error_kind = null, finished_at = null, part_started_at = null, heartbeat_at = now(),
           alerted = false, step = 'resuming', detail = null
     where id = r.id;
    perform public.studio_log_event(r.task_id, r.id, 'system', 'retry',
      case when r.next_part < jsonb_array_length(r.plan -> 'images')
           then format('Spitz pressed Retry: continuing from picture %s of %s (%s already saved).', r.next_part + 1, jsonb_array_length(r.plan -> 'images'), jsonb_array_length(r.done_assets))
           else format('Spitz pressed Retry: posting the %s saved picture(s).', jsonb_array_length(r.done_assets)) end);
    perform public.studio_continue_run(r.id);
  else
    perform public.studio_log_event(r.task_id, r.id, 'system', 'retry', 'Spitz pressed Retry: starting the turn again.');
    perform public.studio_wake_worker_now(r.task_id);
  end if;
  return jsonb_build_object('retried', true);
end $$;

create or replace function public.studio_watch_runs()
returns integer language plpgsql security definer set search_path = '' as $$
declare r record; n integer := 0; why text;
begin
  for r in
    select x.*, t.title, t.turn, t.status as task_status, t.version as task_ver
      from public.studio_worker_runs x join public.studio_tasks t on t.id = x.task_id
     where x.status = 'started' and coalesce(x.heartbeat_at, x.created_at) < now() - interval '50 seconds'
  loop
    if r.task_status <> 'open' or r.turn <> 'openai_worker' then
      update public.studio_worker_runs set status = 'skipped', detail = 'Closed: the task changed hands while this run was stopped.', finished_at = now(), part_started_at = null where id = r.id;
      perform public.studio_log_event(r.task_id, r.id, 'system', 'skip', 'A stopped ChatGPT worker run was closed because the task had already moved on.');
    elsif r.plan is not null and r.part_started_at is null and r.resumes < 2 then
      update public.studio_worker_runs set resumes = resumes + 1, heartbeat_at = now(), step = coalesce(step, 'resuming') where id = r.id;
      perform public.studio_log_event(r.task_id, r.id, 'system', 'retry', 'The next step never started, so the worker was woken again (nothing is redrawn).');
      perform public.studio_continue_run(r.id);
    else
      why := case
        when r.plan is null and r.step is null then 'Stopped while reading the task or planning'
        else 'Stopped while ' || coalesce(r.step, 'between steps') end
        || format(' (no update for %s s).', extract(epoch from now() - coalesce(r.heartbeat_at, r.created_at))::int)
        || case when r.part_started_at is not null and r.step like 'drawing%' then ' That picture was not saved; OpenAI may still bill for it.' else '' end
        || case when jsonb_array_length(r.done_assets) > 0 then format(' %s picture(s) already saved.', jsonb_array_length(r.done_assets)) else '' end
        || ' Press Retry on the task to carry on.';
      update public.studio_worker_runs set status = 'stalled', error_kind = 'stalled', detail = why, finished_at = now(), part_started_at = null where id = r.id;
      perform public.studio_log_event(r.task_id, r.id, 'system', 'stalled', why);
      perform public.studio_alert_run(r.id, 'ChatGPT worker stopped', r.title || '. ' || why);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- 9. Grants (match the live pattern: Task Drop entry points for signed-in apps, internals for service_role).
revoke all on function public.studio_create_task(text, text, text, text, text, jsonb, text) from public, anon;
revoke all on function public.studio_post_message(uuid, text, text, text, jsonb, text, text, integer, text) from public, anon;
revoke all on function public.studio_current_agent(text) from public, anon;
revoke all on function public.studio_current_app() from public, anon;
revoke all on function public.studio_resolve_author(text) from public, anon;
revoke all on function public.studio_schema() from public, anon;
revoke all on function public.studio_check_turn(text) from public, anon;
grant execute on function public.studio_create_task(text, text, text, text, text, jsonb, text) to authenticated, service_role;
grant execute on function public.studio_post_message(uuid, text, text, text, jsonb, text, text, integer, text) to authenticated, service_role;
grant execute on function public.studio_current_agent(text) to authenticated, service_role;
grant execute on function public.studio_schema() to authenticated, service_role;
grant execute on function public.studio_current_app(), public.studio_resolve_author(text), public.studio_check_turn(text) to service_role;

commit;
