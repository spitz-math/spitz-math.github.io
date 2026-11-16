-- spitz.dev: retry a refused Claude wake. Anthropic refuses a fire ("this project is paused") while the
-- previous Claude worker run is still open, so once a minute we re-send a wake that was refused,
-- as long as the task is still open on Claude's turn. Capped at 10 wakes per task per hour.
create extension if not exists pg_cron;

create table if not exists public.studio_claude_wakes (
  id bigserial primary key,
  task_id uuid not null,
  request_id bigint,
  created_at timestamptz not null default now()
);
alter table public.studio_claude_wakes enable row level security;
revoke all on public.studio_claude_wakes from anon, authenticated;

create or replace function public.studio_wake_claude_now(p_task_id uuid)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  tok text;
  rid bigint;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'claude_worker_token';
  if tok is null or tok = '' then return null; end if;
  rid := net.http_post(
    url := 'https://api.anthropic.com/v1/claude_code/routines/trig_01R3xPcYUranZyW4ba6r11yg/fire',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok, 'anthropic-version', '2023-06-01'),
    body := jsonb_build_object('text', 'Task Drop handed task ' || p_task_id::text || ' to Claude.'),
    timeout_milliseconds := 10000);
  insert into public.studio_claude_wakes (task_id, request_id) values (p_task_id, rid);
  return rid;
end;
$$;
revoke all on function public.studio_wake_claude_now(uuid) from public, anon, authenticated;

create or replace function public.studio_retry_claude_wakes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  w record;
  n integer := 0;
begin
  for w in
    select distinct on (cw.task_id) cw.task_id, cw.request_id, cw.created_at
      from public.studio_claude_wakes cw
      join public.studio_tasks t on t.id = cw.task_id and t.turn = 'claude' and t.status = 'open'
     where cw.created_at > now() - interval '1 hour'
     order by cw.task_id, cw.created_at desc
  loop
    continue when w.created_at > now() - interval '50 seconds';
    continue when not exists (select 1 from net._http_response r where r.id = w.request_id
                                and (r.status_code is null or r.status_code not between 200 and 299));
    continue when (select count(*) from public.studio_claude_wakes where task_id = w.task_id and created_at > now() - interval '1 hour') >= 10;
    perform public.studio_wake_claude_now(w.task_id);
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.studio_retry_claude_wakes() from public, anon, authenticated;

select cron.schedule('studio-retry-claude-wakes', '* * * * *', 'select public.studio_retry_claude_wakes()');
