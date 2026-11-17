-- ChatGPT worker (Spitz.dev): when a task becomes ChatGPT's turn, the database wakes the
-- edge function `chatgpt-worker`, which does ChatGPT's turn through the OpenAI API and posts back.
--
-- Safety:
--   * The worker posts ONLY as 'chatgpt', through studio_worker_post, which only the service role can run.
--   * Each task version is worked at most once (studio_worker_runs unique on task + version).
--   * Daily cap and a per-task loop cap live in the worker; every run is logged here.
--   * The wake call carries a random secret kept in Vault; the worker checks it with studio_worker_secret_ok.

create extension if not exists pg_net with schema extensions;

-- 1. The shared secret between the database and the worker (random, never leaves the server).
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'studio_worker_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'studio_worker_secret', 'Wake secret for the chatgpt-worker edge function');
  end if;
end $$;

create or replace function public.studio_worker_secret_ok(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'studio_worker_secret' and decrypted_secret = p_secret);
$$;
revoke all on function public.studio_worker_secret_ok(text) from public, anon, authenticated;
grant execute on function public.studio_worker_secret_ok(text) to service_role;

-- 2. Run log: one row per (task, version) the worker picked up.
create table if not exists public.studio_worker_runs (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.studio_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  task_version integer not null,
  status text not null default 'started' check (status in ('started','ok','error','skipped')),
  detail text,
  model text,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (task_id, task_version)
);
alter table public.studio_worker_runs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'studio_worker_runs' and policyname = 'studio_worker_runs_read_own') then
    create policy "studio_worker_runs_read_own" on public.studio_worker_runs for select to authenticated using (user_id = (select auth.uid()));
  end if;
end $$;
revoke all on public.studio_worker_runs from anon, authenticated;
grant select on public.studio_worker_runs to authenticated;

-- 3. The worker's only way to write a message: always as 'chatgpt', same rules as studio_post_message.
create or replace function public.studio_worker_post(
  p_task_id uuid, p_request_key text, p_kind text, p_body text,
  p_refs jsonb default '[]'::jsonb, p_set_status text default null, p_set_turn text default null,
  p_expected_version integer default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_worker_post(uuid, text, text, text, jsonb, text, text, integer) from public, anon, authenticated;
grant execute on function public.studio_worker_post(uuid, text, text, text, jsonb, text, text, integer) to service_role;

-- 4. Wake the worker (fire and forget; the worker re-reads the task itself).
create or replace function public.studio_wake_worker_now(p_task_id uuid)
returns bigint
language plpgsql
volatile
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
    body := jsonb_build_object('task_id', p_task_id),
    timeout_milliseconds := 5000);
end;
$$;
revoke all on function public.studio_wake_worker_now(uuid) from public, anon, authenticated;

-- 4a. Automatic: whenever a task lands on ChatGPT's turn (open), wake the worker.
create or replace function public.studio_tasks_wake_worker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.turn = 'chatgpt' and new.status = 'open' and (tg_op = 'INSERT' or old.version is distinct from new.version) then
    perform public.studio_wake_worker_now(new.id);
  end if;
  return new;
end;
$$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'studio_tasks_wake_worker') then
    create trigger studio_tasks_wake_worker after insert or update on public.studio_tasks
      for each row execute function public.studio_tasks_wake_worker();
  end if;
end $$;

-- 4b. By hand from the dashboard ("run ChatGPT now"): owner only, and only on ChatGPT's turn.
create or replace function public.studio_wake_worker(p_task_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
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
$$;
revoke all on function public.studio_wake_worker(uuid) from public, anon;
grant execute on function public.studio_wake_worker(uuid) to authenticated;
