-- spitz.dev: make the instant Claude wake work and never double-start.
-- 1. Anthropic refuses a routine fire that carries text ("this project is paused") but accepts an empty body,
--    so the wake sends {}. The worker looks up its own tasks.
-- 2. The fire endpoint has no idempotency, so we keep our own: at most one successful wake per task VERSION.
--    A wake is skipped if one for this version succeeded or is still waiting on a reply.
-- 3. The retry job only re-sends a FAILED wake for the same version, at most 3 retries (4 wakes) per version.
alter table public.studio_claude_wakes add column if not exists task_version integer;

create or replace function public.studio_wake_claude_now(p_task_id uuid)
returns bigint
language plpgsql
volatile
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
  -- one per version: skip if a wake for this version succeeded, or is still in flight (no reply yet, under 2 minutes old)
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
  return rid;
end;
$$;
revoke all on function public.studio_wake_claude_now(uuid) from public, anon, authenticated;

-- retry: tasks still open on Claude's turn whose latest wake for the CURRENT version failed
create or replace function public.studio_retry_claude_wakes()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_retry_claude_wakes() from public, anon, authenticated;
