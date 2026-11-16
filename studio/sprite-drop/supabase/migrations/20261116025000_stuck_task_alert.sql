-- spitz.dev: phone alert when a task is stuck. Every 5 minutes: any open task that has sat on ChatGPT's or
-- Claude's turn for 30+ minutes gets ONE phone notification per task version (so no repeats).
-- Catches silent failures like an expired connector sign-in. Applied 2026-11-16.
create table if not exists public.studio_stuck_alerts (
  task_id uuid not null,
  task_version integer not null,
  created_at timestamptz not null default now(),
  primary key (task_id, task_version)
);
alter table public.studio_stuck_alerts enable row level security;
revoke all on public.studio_stuck_alerts from anon, authenticated;

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
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'studio_worker_secret';
  if s is null then return 0; end if;
  for t in
    select tk.id, tk.version, tk.turn, tk.title, tk.user_id from public.studio_tasks tk
     where tk.status = 'open' and tk.turn in ('chatgpt', 'claude')
       and tk.updated_at < now() - interval '30 minutes'
       and not exists (select 1 from public.studio_stuck_alerts a where a.task_id = tk.id and a.task_version = tk.version)
  loop
    insert into public.studio_stuck_alerts (task_id, task_version) values (t.id, t.version) on conflict do nothing;
    perform net.http_post(
      url := 'https://klbbcwlddgtsolvsxvwe.supabase.co/functions/v1/push-notify',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-worker-secret', s),
      body := jsonb_build_object('user_id', t.user_id,
        'title', 'Stuck: ' || coalesce(who ->> t.turn, t.turn) || '''s turn for 30+ min',
        'body', t.title || '. Check the ' || case when t.turn = 'claude' then 'Sprite Drop connector in Claude' else 'ChatGPT worker' end || ', or open the dashboard.',
        'tag', 'stuck-' || t.id::text),
      timeout_milliseconds := 5000);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.studio_alert_stuck_tasks() from public, anon, authenticated;

select cron.schedule('studio-stuck-task-alert', '*/5 * * * *', 'select public.studio_alert_stuck_tasks()');
