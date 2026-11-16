-- spitz.dev: wake the Claude worker (a Claude Code cloud scheduled task) the moment a task is handed to Claude.
-- Applied 2026-11-16. Uses the scheduled task's API trigger; its token lives in Vault as 'claude_worker_token' (Kody adds it).
-- No token = no call. Fires only when the turn CHANGES to claude (or a task is created on Claude's turn),
-- so Claude's own notes can't loop it. The hourly schedule stays on as a backup.
create or replace function public.studio_wake_claude_now(p_task_id uuid)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  tok text;
begin
  select decrypted_secret into tok from vault.decrypted_secrets where name = 'claude_worker_token';
  if tok is null or tok = '' then return null; end if;
  return net.http_post(
    url := 'https://api.anthropic.com/v1/claude_code/routines/trig_01R3xPcYUranZyW4ba6r11yg/fire',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tok, 'anthropic-version', '2023-06-01'),
    body := jsonb_build_object('text', 'Task Drop handed task ' || p_task_id::text || ' to Claude.'),
    timeout_milliseconds := 10000);
end;
$$;
revoke all on function public.studio_wake_claude_now(uuid) from public, anon, authenticated;

create or replace function public.studio_tasks_wake_claude()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.turn = 'claude' and new.status = 'open'
     and (tg_op = 'INSERT' or old.turn is distinct from new.turn or old.status is distinct from new.status) then
    perform public.studio_wake_claude_now(new.id);
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'studio_tasks_wake_claude') then
    create trigger studio_tasks_wake_claude after insert or update on public.studio_tasks
      for each row execute function public.studio_tasks_wake_claude();
  end if;
end $$;
