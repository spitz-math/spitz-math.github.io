-- spitz.dev: real progress for the ChatGPT worker, a per-task activity feed, and stall detection.
--
-- Why: Supabase stops an edge function 150 s after it starts (free plan). A run that planned AND drew pictures in one
-- call was killed at 150 s twice on 2026-11-16 and stayed "started" forever with no message. The worker now does one
-- OpenAI call per function call (plan, then each picture) and chains itself through studio_continue_run, beating a
-- heartbeat every 10 s. A watchdog notices a run whose heartbeat stopped.
--
-- 1. studio_run_events: timestamped execution events per task (wake sent, task opened, step started, picture saved,
--    handed off, failed, stalled, retried, wake skipped). Owner can read; only the worker and these functions write.
-- 2. studio_worker_runs: step, heartbeat_at, plan, saved pictures, part in flight, resumes, alerted.
-- 3. Wake functions log a 'wake' event with the pg_net request id, so the feed can show whether the wake was accepted.
-- 4. studio_note_read(task): Sprite Drop's get_task calls it, so "Claude opened the task" is a real event,
--    separate from "a wake was sent".
-- 5. studio_continue_run(run): the worker's next step, sent through pg_net with the worker secret.
-- 6. studio_watch_runs(): every minute. A run whose heartbeat is 50+ s old is dead. If no paid call was in flight
--    (between steps), it resumes once on its own. Otherwise it is marked stalled, a 'stalled' event is logged and
--    Kody gets ONE phone alert for that run. Nothing paid is ever retried without Kody pressing Retry.
-- 7. studio_retry_run(run): Kody's Retry button. Keeps every picture already saved; studio_alert_run sends one phone alert per run.
-- 8. studio_task_activity(task): the feed for the dashboard (events + whether each wake was accepted).
-- 9. studio_now(): adds each run's step, heartbeat, plan size, saved count and the latest "opened" event per agent.

create table if not exists public.studio_run_events (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.studio_tasks (id) on delete cascade,
  user_id uuid not null,
  run_id bigint,
  task_version integer,
  actor text not null,              -- chatgpt | claude | system
  kind text not null,               -- wake | read | start | step | saved | handoff | done | error | stalled | retry | skip
  detail text,
  request_id bigint,                -- pg_net request for wake events
  at timestamptz not null default now()
);
create index if not exists studio_run_events_task_at on public.studio_run_events (task_id, at desc);
alter table public.studio_run_events enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'studio_run_events' and policyname = 'studio_run_events_owner_read') then
    create policy studio_run_events_owner_read on public.studio_run_events for select to authenticated using (user_id = auth.uid());
  end if;
end $$;
revoke all on public.studio_run_events from anon, authenticated;
grant select on public.studio_run_events to authenticated;

alter table public.studio_worker_runs
  add column if not exists step text,
  add column if not exists heartbeat_at timestamptz,
  add column if not exists plan jsonb,
  add column if not exists done_assets jsonb not null default '[]'::jsonb,
  add column if not exists next_part integer not null default 0,
  add column if not exists part_started_at timestamptz,
  add column if not exists resumes integer not null default 0,
  add column if not exists alerted boolean not null default false;
alter table public.studio_worker_runs drop constraint if exists studio_worker_runs_status_check;
alter table public.studio_worker_runs add constraint studio_worker_runs_status_check check (status in ('started', 'ok', 'error', 'skipped', 'stalled'));

create or replace function public.studio_log_event(p_task_id uuid, p_run_id bigint, p_actor text, p_kind text, p_detail text, p_request_id bigint default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.studio_run_events (task_id, user_id, run_id, task_version, actor, kind, detail, request_id)
  select t.id, t.user_id, p_run_id, t.version, p_actor, p_kind, left(p_detail, 600), p_request_id
    from public.studio_tasks t where t.id = p_task_id;
$$;
revoke all on function public.studio_log_event(uuid, bigint, text, text, text, bigint) from public, anon, authenticated;

-- ChatGPT wake: same as before, plus a 'wake' event
create or replace function public.studio_wake_worker_now(p_task_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Claude wake: same rules as before, plus a 'wake' event
create or replace function public.studio_wake_claude_now(p_task_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  tok text;
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
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'claude_worker_token';
  if tok is null or tok = '' then return null; end if;
  rid := net.http_post(
    url := 'https://api.anthropic.com/v1/claude_code/routines/trig_01R3xPcYUranZyW4ba6r11yg/fire',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok, 'anthropic-version', '2023-06-01'),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000);
  insert into public.studio_claude_wakes (task_id, task_version, request_id) values (p_task_id, ver, rid);
  perform public.studio_log_event(p_task_id, null, 'claude', 'wake', 'Wake request sent to Claude', rid);
  return rid;
end;
$$;

-- An agent opened the task through Sprite Drop (once per agent per task version)
create or replace function public.studio_note_read(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_note_read(uuid) from public, anon;
grant execute on function public.studio_note_read(uuid) to authenticated;

-- The worker's next step (one OpenAI call per function call)
create or replace function public.studio_continue_run(p_run_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_continue_run(bigint) from public, anon, authenticated;
grant execute on function public.studio_continue_run(bigint) to service_role;

-- One phone alert per run (and it counts as the 30-minute stuck alert for that task version, so no second ping)
create or replace function public.studio_alert_run(p_run_id bigint, p_title text, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_alert_run(bigint, text, text) from public, anon, authenticated;
grant execute on function public.studio_alert_run(bigint, text, text) to service_role;

-- Watchdog: dead runs (heartbeat 50+ s old)
create or replace function public.studio_watch_runs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
      -- the task moved on without this run: close it quietly
      update public.studio_worker_runs set status = 'skipped', detail = 'Closed: the task changed hands while this run was stopped.', finished_at = now(), part_started_at = null where id = r.id;
      perform public.studio_log_event(r.task_id, r.id, 'system', 'skip', 'A stopped ChatGPT run was closed because the task had already moved on.');
    elsif r.plan is not null and r.part_started_at is null and r.resumes < 2 then
      -- between steps (nothing paid in flight): pick it up again once or twice on its own
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
$$;
revoke all on function public.studio_watch_runs() from public, anon, authenticated;

-- Runs that died before this change (killed at 150 s, no heartbeat): mark them stalled now, without a phone alert
with dead as (
  update public.studio_worker_runs
     set status = 'stalled', error_kind = 'stalled', alerted = true, finished_at = coalesce(finished_at, created_at + interval '150 seconds'),
         detail = 'Stopped by Supabase''s 150-second limit: the old worker planned and drew in one call. Nothing was saved. Press Retry to start the turn again.'
   where status = 'started' and heartbeat_at is null and created_at < now() - interval '10 minutes'
  returning id, task_id, detail)
select public.studio_log_event(task_id, id, 'system', 'stalled', detail) from dead;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'studio-watch-runs') then
    perform cron.schedule('studio-watch-runs', '* * * * *', 'select public.studio_watch_runs()');
  end if;
end $$;

-- Kody's Retry: picks a stalled or failed run back up. Saved pictures are kept; only the unfinished step runs again.
create or replace function public.studio_retry_run(p_run_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
    -- nothing reusable (failed while planning): start the turn over
    perform public.studio_log_event(r.task_id, r.id, 'system', 'retry', 'Kody pressed Retry: starting the turn again.');
    perform public.studio_wake_worker_now(r.task_id);
  end if;
  return jsonb_build_object('retried', true);
end;
$$;
revoke all on function public.studio_retry_run(bigint) from public, anon;
grant execute on function public.studio_retry_run(bigint) to authenticated;

-- Activity feed for one task: execution events, with each wake's result
create or replace function public.studio_task_activity(p_task_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'at', e.at, 'actor', e.actor, 'kind', e.kind, 'detail', e.detail, 'run_id', e.run_id, 'version', e.task_version,
           'wake_code', r.status_code, 'wake_error', left(r.error_msg, 200), 'wake_pending', e.request_id is not null and r.id is null)
         order by e.at desc), '[]'::jsonb)
    from (select * from public.studio_run_events where task_id = p_task_id and user_id = auth.uid() order by at desc limit 200) e
    left join net._http_response r on r.id = e.request_id;
$$;
revoke all on function public.studio_task_activity(uuid) from public, anon;
grant execute on function public.studio_task_activity(uuid) to authenticated;

-- Now view data: adds the run's step, heartbeat and pictures, and when each agent last opened the task
create or replace function public.studio_now()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_now() from public, anon;
grant execute on function public.studio_now() to authenticated;
