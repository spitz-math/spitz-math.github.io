-- Read-only snapshot of live studio functions, 2026-11-17
CREATE OR REPLACE FUNCTION public.studio_check_refs(p_refs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r jsonb;
begin
  if p_refs is null then return '[]'::jsonb; end if;
  if jsonb_typeof(p_refs) <> 'array' or jsonb_array_length(p_refs) > 20 then
    raise exception 'refs must be a list of at most 20 items' using errcode = '22023';
  end if;
  for r in select * from jsonb_array_elements(p_refs) loop
    if r ->> 'type' = 'asset' then
      if not exists (select 1 from public.studio_assets a where a.id::text = r ->> 'id' and a.user_id = auth.uid()) then
        raise exception 'No Sprite Drop asset with id %', r ->> 'id' using errcode = '22023';
      end if;
    elsif r ->> 'type' in ('commit','pr','url') then
      if coalesce(r ->> 'url', '') !~ '^https://[^[:space:]]+$' or char_length(r ->> 'url') > 500 then
        raise exception 'A % ref needs an https url', r ->> 'type' using errcode = '22023';
      end if;
    else
      raise exception 'Unknown ref type %', coalesce(r ->> 'type', '(none)') using errcode = '22023';
    end if;
  end loop;
  return p_refs;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_create_task(p_request_key text, p_project text, p_title text, p_brief text, p_turn text DEFAULT NULL::text, p_refs jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me text := public.studio_current_agent();
  uid uuid := auth.uid();
  t public.studio_tasks;
begin
  select * into t from public.studio_tasks where user_id = uid and request_key = p_request_key;
  if found then
    if t.project <> p_project or t.title <> p_title then
      raise exception 'request_key % was already used for a different task', p_request_key using errcode = '22023';
    end if;
    return jsonb_build_object('duplicate', true, 'task', to_jsonb(t));
  end if;
  insert into public.studio_tasks (user_id, project, title, brief, turn, created_by, refs, request_key)
  values (uid, p_project, p_title, p_brief, p_turn, me, public.studio_check_refs(p_refs), p_request_key)
  on conflict (user_id, request_key) do nothing
  returning * into t;
  if t.id is null then
    select * into t from public.studio_tasks where user_id = uid and request_key = p_request_key;
    return jsonb_build_object('duplicate', true, 'task', to_jsonb(t));
  end if;
  return jsonb_build_object('duplicate', false, 'task', to_jsonb(t));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_current_agent()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  cid uuid;
  uris text;
  hosts text[];
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  begin
    cid := (auth.jwt() ->> 'client_id')::uuid;
  exception when others then
    cid := null;
  end;
  if cid is null then
    if auth.jwt() ->> 'client_id' is not null then
      raise exception 'Unreadable client_id in the token' using errcode = '28000';
    end if;
    if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
      raise exception 'Anonymous sessions cannot use Task Drop' using errcode = '28000';
    end if;
    return 'kody';
  end if;
  select c.redirect_uris into uris
  from auth.oauth_clients c
  where c.id = cid and c.deleted_at is null
    and exists (select 1 from auth.oauth_consents o
                where o.client_id = c.id and o.user_id = auth.uid() and o.revoked_at is null);
  if uris is null then
    raise exception 'This app is not approved for this account' using errcode = '28000';
  end if;
  select array_agg(distinct substring(u from '^https://([^/:]+)'))
    into hosts
  from regexp_split_to_table(trim(uris), '[,[:space:]]+') as u
  where u <> '';
  if hosts = array['claude.ai'] then return 'claude'; end if;
  if hosts = array['chatgpt.com'] then return 'chatgpt'; end if;
  raise exception 'Unknown app (returns to %). Ask Claude to add it before it can use Task Drop.', array_to_string(hosts, ', ') using errcode = '28000';
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_log_event(p_task_id uuid, p_run_id bigint, p_actor text, p_kind text, p_detail text, p_request_id bigint DEFAULT NULL::bigint)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  insert into public.studio_run_events (task_id, user_id, run_id, task_version, actor, kind, detail, request_id)
  select t.id, t.user_id, p_run_id, t.version, p_actor, p_kind, left(p_detail, 600), p_request_id
    from public.studio_tasks t where t.id = p_task_id;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_notify_phone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.studio_post_message(p_task_id uuid, p_request_key text, p_kind text, p_body text, p_refs jsonb DEFAULT '[]'::jsonb, p_set_status text DEFAULT NULL::text, p_set_turn text DEFAULT NULL::text, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me text := public.studio_current_agent();
  uid uuid := auth.uid();
  t public.studio_tasks;
  m public.studio_messages;
  changes boolean := p_set_status is not null or p_set_turn is not null;
  next_seq integer;
begin
  select * into m from public.studio_messages where user_id = uid and request_key = p_request_key;
  if found then
    if m.task_id <> p_task_id then
      raise exception 'request_key % was already used on another task', p_request_key using errcode = '22023';
    end if;
    select * into t from public.studio_tasks where id = m.task_id;
    return jsonb_build_object('duplicate', true, 'message', to_jsonb(m), 'task', to_jsonb(t));
  end if;

  select * into t from public.studio_tasks where id = p_task_id and user_id = uid for update;
  if not found then
    raise exception 'No task with id %', p_task_id using errcode = '22023';
  end if;
  if changes and (p_expected_version is null or p_expected_version <> t.version) then
    return jsonb_build_object('conflict', true,
      'reason', case when p_expected_version is null then 'expected_version is required to change status or turn'
                     else 'the task changed since you read it' end,
      'task', to_jsonb(t));
  end if;

  select coalesce(max(seq), 0) + 1 into next_seq from public.studio_messages where task_id = t.id;
  insert into public.studio_messages (task_id, user_id, seq, author, kind, body, refs, set_status, set_turn, request_key)
  values (t.id, uid, next_seq, me, p_kind, p_body, public.studio_check_refs(p_refs), p_set_status, p_set_turn, p_request_key)
  returning * into m;

  update public.studio_tasks
     set status = coalesce(p_set_status, status),
         turn = case when p_set_turn is not null then p_set_turn else turn end,
         version = version + 1,
         updated_at = now()
   where id = t.id
  returning * into t;
  return jsonb_build_object('duplicate', false, 'message', to_jsonb(m), 'task', to_jsonb(t));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_tasks_wake_claude()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.turn = 'claude' and new.status = 'open'
     and (tg_op = 'INSERT' or old.turn is distinct from new.turn or old.status is distinct from new.status) then
    perform public.studio_wake_claude_now(new.id);
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_tasks_wake_worker()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.turn = 'chatgpt' and new.status = 'open' and (tg_op = 'INSERT' or old.version is distinct from new.version) then
    perform public.studio_wake_worker_now(new.id);
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_wake_claude_now(p_task_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  tok text; trig text := 'trig_01R3xPcYUranZyW4ba6r11yg';
  ver integer;
  rid bigint;
begin
  select version into ver from public.studio_tasks where id = p_task_id and turn = 'claude' and status = 'open';
  if ver is null then return null; end if;
  if exists (
    select 1 from public.studio_claude_wakes w left join net._http_response r on r.id = w.request_id
     where w.task_id = p_task_id and w.task_version = ver
       and ((r.status_code between 200 and 299) or (r.id is null and w.created_at > now() - interval '2 minutes'))
  ) then return null; end if;
  if (select count(*) from public.studio_claude_wakes where task_id = p_task_id and task_version = ver) >= 4 then return null; end if;
  -- one-thread worker: once Kody saves its token as 'claude_worker_token_one', wakes go to the single worker thread
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'claude_worker_token_one';
  if tok is not null and tok <> '' then
    trig := 'trig_016YswDPzEezFT34FYnDZpgg';
  else
    select decrypted_secret into tok from vault.decrypted_secrets where name = 'claude_worker_token';
  end if;
  if tok is null or tok = '' then return null; end if;
  rid := net.http_post(
    url := 'https://api.anthropic.com/v1/claude_code/routines/' || trig || '/fire',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok, 'anthropic-version', '2023-06-01'),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000);
  insert into public.studio_claude_wakes (task_id, task_version, request_id) values (p_task_id, ver, rid);
  perform public.studio_log_event(p_task_id, null, 'claude', 'wake', 'Wake request sent to Claude', rid);
  return rid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_wake_worker(p_task_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.studio_tasks;
begin
  select * into t from public.studio_tasks where id = p_task_id and user_id = auth.uid();
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  if t.turn <> 'chatgpt' or t.status <> 'open' then
    return jsonb_build_object('woken', false, 'reason', 'It is not ChatGPT''s turn on this task.');
  end if;
  perform public.studio_wake_worker_now(t.id);
  return jsonb_build_object('woken', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_wake_worker_now(p_task_id uuid)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s text;
  rid bigint;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  rid := net.http_post(
    url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/chatgpt-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
    body := jsonb_build_object('task_id', p_task_id),
    timeout_milliseconds := 5000);
  perform public.studio_log_event(p_task_id, null, 'chatgpt', 'wake', 'Wake request sent to the ChatGPT worker', rid);
  return rid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_worker_post(p_task_id uuid, p_request_key text, p_kind text, p_body text, p_refs jsonb DEFAULT '[]'::jsonb, p_set_status text DEFAULT NULL::text, p_set_turn text DEFAULT NULL::text, p_expected_version integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.studio_tasks;
  m public.studio_messages;
  r jsonb;
  next_seq integer;
begin
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
  insert into public.studio_messages (task_id, user_id, seq, author, kind, body, refs, set_status, set_turn, request_key)
  values (t.id, t.user_id, next_seq, 'chatgpt', p_kind, p_body, coalesce(p_refs, '[]'::jsonb), p_set_status, p_set_turn, p_request_key)
  returning * into m;
  update public.studio_tasks
     set status = coalesce(p_set_status, status),
         turn = case when p_set_turn is not null then p_set_turn else turn end,
         version = version + 1, updated_at = now()
   where id = t.id
  returning * into t;
  return jsonb_build_object('duplicate', false, 'message', to_jsonb(m), 'task', to_jsonb(t));
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_alert_run(p_run_id bigint, p_title text, p_body text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.studio_worker_runs;
  s text;
  ver integer;
begin
  update public.studio_worker_runs set alerted = true where id = p_run_id and not alerted returning * into r;
  if not found then return; end if;
  select version into ver from public.studio_tasks where id = r.task_id;
  insert into public.studio_stuck_alerts (task_id, task_version) values (r.task_id, ver) on conflict do nothing;
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  if s is null or not exists (select 1 from public.studio_push_subs where user_id = r.user_id) then return; end if;
  perform net.http_post(
    url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
    body := jsonb_build_object('user_id', r.user_id, 'title', p_title, 'body', left(p_body, 300), 'tag', 'run-' || r.id),
    timeout_milliseconds := 5000);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_alert_stuck_tasks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t record;
  s text;
  n integer := 0;
  who jsonb := '{"chatgpt":"ChatGPT","claude":"Claude"}';
  send_alert boolean;
  ttl text;
  msg text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  if s is null then return 0; end if;
  for t in
    select tk.id, tk.version, tk.turn, tk.title, tk.user_id, tk.updated_at,
           (select max(w.created_at) from public.studio_claude_wakes w join net._http_response r on r.id = w.request_id
             where w.task_id = tk.id and w.task_version = tk.version and r.status_code between 200 and 299) as woke_at,
           (select count(*) from public.studio_messages m
             where m.task_id = tk.id and m.set_turn in ('chatgpt', 'claude')
               and m.seq > coalesce((select max(k.seq) from public.studio_messages k where k.task_id = tk.id and k.author = 'kody'), 0)) as handoffs
      from public.studio_tasks tk
     where tk.status = 'open' and tk.turn in ('chatgpt', 'claude')
  loop
    send_alert := false;
    -- stuck on one turn
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
    -- bouncing back and forth without Kody (alerted once per task, marked as version 0)
    if not send_alert and t.handoffs >= 8
       and not exists (select 1 from public.studio_stuck_alerts a where a.task_id = t.id and a.task_version = 0) then
      send_alert := true;
      ttl := 'Going back and forth: ' || t.handoffs || ' hand-offs';
      msg := t.title || '. ChatGPT and Claude keep passing it without finishing. Open the dashboard and decide.';
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
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_continue_run(p_run_id bigint)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  return net.http_post(
    url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/chatgpt-worker',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
    body := jsonb_build_object('run_id', p_run_id),
    timeout_milliseconds := 5000);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_note_read(p_task_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.studio_tasks;
  a text;
begin
  select * into t from public.studio_tasks where id = p_task_id and user_id = auth.uid();
  if not found then return; end if;
  begin a := public.studio_current_agent(); exception when others then a := null; end;
  if a is null then return; end if;
  if exists (select 1 from public.studio_run_events e where e.task_id = t.id and e.actor = a and e.kind = 'read' and e.task_version = t.version) then return; end if;
  insert into public.studio_run_events (task_id, user_id, task_version, actor, kind, detail)
  values (t.id, t.user_id, t.version, a, 'read', 'Opened the task');
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_now()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
                     where e.task_id = t.id and e.actor = 'chatgpt' and e.kind = 'wake' order by e.at desc limit 1),
        'read', (select jsonb_object_agg(z.actor, z.at) from (select e.actor, max(e.at) as at from public.studio_run_events e
                   where e.task_id = t.id and e.kind = 'read' and e.task_version = t.version group by e.actor) z),
        'last_event', (select jsonb_build_object('at', e.at, 'actor', e.actor, 'kind', e.kind, 'detail', e.detail)
                         from public.studio_run_events e where e.task_id = t.id order by e.at desc limit 1),
        'handoffs', (select count(*) from public.studio_messages m
                      where m.task_id = t.id and m.set_turn in ('chatgpt', 'claude')
                        and m.seq > coalesce((select max(k.seq) from public.studio_messages k where k.task_id = t.id and k.author = 'kody'), 0))))
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
$function$
;

CREATE OR REPLACE FUNCTION public.studio_retry_claude_wakes()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t record;
  n integer := 0;
begin
  for t in
    select tk.id from public.studio_tasks tk
     where tk.turn = 'claude' and tk.status = 'open'
       and exists (select 1 from public.studio_claude_wakes w where w.task_id = tk.id and w.task_version = tk.version)
       and not exists (select 1 from public.studio_claude_wakes w where w.task_id = tk.id and w.task_version = tk.version and w.created_at > now() - interval '50 seconds')
       and exists (select 1 from public.studio_claude_wakes w join net._http_response r on r.id = w.request_id
                    where w.task_id = tk.id and w.task_version = tk.version
                      and w.created_at = (select max(created_at) from public.studio_claude_wakes w2 where w2.task_id = tk.id and w2.task_version = tk.version)
                      and (r.status_code is null or r.status_code not between 200 and 299))
  loop
    if public.studio_wake_claude_now(t.id) is not null then n := n + 1; end if;
  end loop;
  return n;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_retry_run(p_run_id bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.studio_worker_runs;
  t public.studio_tasks;
begin
  select * into r from public.studio_worker_runs where id = p_run_id and user_id = auth.uid();
  if not found then raise exception 'No run %', p_run_id using errcode = '22023'; end if;
  select * into t from public.studio_tasks where id = r.task_id;
  if r.status not in ('stalled', 'error') then return jsonb_build_object('retried', false, 'reason', 'That run is not stopped.'); end if;
  if exists (select 1 from public.studio_worker_runs x where x.task_id = r.task_id and x.status = 'started' and x.heartbeat_at > now() - interval '50 seconds') then
    return jsonb_build_object('retried', false, 'reason', 'ChatGPT is already working on this task.');
  end if;
  if t.status <> 'open' or t.turn <> 'chatgpt' then
    return jsonb_build_object('retried', false, 'reason', 'Hand the task back to ChatGPT first (Send + ChatGPT''s turn).');
  end if;
  if r.plan is not null then
    update public.studio_worker_runs
       set status = 'started', error_kind = null, finished_at = null, part_started_at = null, heartbeat_at = now(),
           alerted = false, step = 'resuming', detail = null
     where id = r.id;
    perform public.studio_log_event(r.task_id, r.id, 'system', 'retry',
      case when r.next_part < jsonb_array_length(r.plan -> 'images')
           then format('Kody pressed Retry: continuing from picture %s of %s (%s already saved).', r.next_part + 1, jsonb_array_length(r.plan -> 'images'), jsonb_array_length(r.done_assets))
           else format('Kody pressed Retry: posting the %s saved picture(s).', jsonb_array_length(r.done_assets)) end);
    perform public.studio_continue_run(r.id);
  else
    perform public.studio_log_event(r.task_id, r.id, 'system', 'retry', 'Kody pressed Retry: starting the turn again.');
    perform public.studio_wake_worker_now(r.task_id);
  end if;
  return jsonb_build_object('retried', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_task_activity(p_task_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', e.at, 'actor', e.actor, 'kind', e.kind, 'detail', e.detail, 'run_id', e.run_id, 'version', e.task_version,
           'wake_code', r.status_code, 'wake_error', left(r.error_msg, 200), 'wake_pending', e.request_id is not null and r.id is null)
         order by e.at desc), '[]'::jsonb)
    from (select * from public.studio_run_events where task_id = p_task_id and user_id = auth.uid() order by at desc limit 200) e
    left join net._http_response r on r.id = e.request_id;
$function$
;

CREATE OR REPLACE FUNCTION public.studio_watch_runs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  n integer := 0;
  why text;
begin
  for r in
    select x.*, t.title, t.turn, t.status as task_status, t.version as task_ver
      from public.studio_worker_runs x join public.studio_tasks t on t.id = x.task_id
     where x.status = 'started' and coalesce(x.heartbeat_at, x.created_at) < now() - interval '50 seconds'
  loop
    if r.task_status <> 'open' or r.turn <> 'chatgpt' then
      update public.studio_worker_runs set status = 'skipped', detail = 'Closed: the task changed hands while this run was stopped.', finished_at = now(), part_started_at = null where id = r.id;
      perform public.studio_log_event(r.task_id, r.id, 'system', 'skip', 'A stopped ChatGPT run was closed because the task had already moved on.');
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
      perform public.studio_alert_run(r.id, 'ChatGPT stopped', r.title || '. ' || why);
    end if;
    n := n + 1;
  end loop;
  return n;
end;
$function$
;
