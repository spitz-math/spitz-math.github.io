-- spitz.dev: data for the dashboard's "Now" view, plus three small alert fixes. NOT applied until Kody says "push it".
--
-- 1. studio_now(): for the signed-in owner, the real worker state of each open task (latest Claude wake for the
--    current version, and the latest ChatGPT run) and a health line (phones saved, last phone alert, alert jobs).
--    The dashboard reads it; nothing is written.
-- 2. Stuck alert, faster for Claude: if Claude was woken for this version 10+ minutes ago and nothing happened
--    since, alert once (usually an expired connector sign-in). The 30-minute rule stays for everything else.
-- 3. Ping-pong alert: if a task has been handed between ChatGPT and Claude 8+ times since Kody last wrote,
--    alert once (version 0 marks this alert, since real versions start at 1).

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
        'run', (select jsonb_build_object('status', x.status, 'version', x.task_version, 'at', x.created_at, 'finished', x.finished_at, 'detail', left(x.detail, 300))
                  from public.studio_worker_runs x where x.task_id = t.id order by x.id desc limit 1),
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

create or replace function public.studio_alert_stuck_tasks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_alert_stuck_tasks() from public, anon, authenticated;
