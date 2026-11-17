-- Task Drop (Spitz.dev experiment 2). Runs in the Sprite Drop project, never Off the Clock.
-- Tasks and an append-only message history that ChatGPT and Claude share.
--
-- Rules the database enforces (not just the tools):
--   * Only the signed-in owner sees their rows (row-level security, select only).
--   * Nobody writes the tables directly. Writes go through two functions that set the
--     author from the verified OAuth app (claude.ai or chatgpt.com), never from an argument.
--   * Messages are never updated or deleted.
--   * Every create/post carries a request_key; a retry returns the original row.
--   * Changing status or turn needs the task's current version, or it returns a conflict.
-- Sprite Drop's tables are not changed.

-- 1. Who is calling: the OAuth app in the signed token, mapped by where that app returns to.
create or replace function public.studio_current_agent()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
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
    raise exception 'Task Drop only accepts calls from a connected app (no client_id in the token)' using errcode = '28000';
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
$$;

-- 2. Tables. Readable by the owner; no write policies at all.
create table if not exists public.studio_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project text not null check (project ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  title text not null check (char_length(title) between 1 and 200),
  brief text not null check (char_length(brief) between 1 and 8000),
  status text not null default 'open' check (status in ('open','blocked','done')),
  turn text check (turn in ('claude','chatgpt','kody')),
  created_by text not null check (created_by in ('claude','chatgpt')),
  refs jsonb not null default '[]'::jsonb check (jsonb_typeof(refs) = 'array' and jsonb_array_length(refs) <= 20),
  version integer not null default 1,
  request_key text not null check (char_length(request_key) between 8 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_key)
);
create index if not exists studio_tasks_inbox on public.studio_tasks (user_id, status, turn, updated_at desc);

create table if not exists public.studio_messages (
  id bigint generated always as identity primary key,
  task_id uuid not null references public.studio_tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  seq integer not null,
  author text not null check (author in ('claude','chatgpt')),
  kind text not null check (kind in ('note','review','question','decision','report')),
  body text not null check (char_length(body) between 1 and 8000),
  refs jsonb not null default '[]'::jsonb check (jsonb_typeof(refs) = 'array' and jsonb_array_length(refs) <= 20),
  set_status text check (set_status in ('open','blocked','done')),
  set_turn text check (set_turn in ('claude','chatgpt','kody')),
  request_key text not null check (char_length(request_key) between 8 and 100),
  created_at timestamptz not null default now(),
  unique (task_id, seq),
  unique (user_id, request_key)
);

alter table public.studio_tasks enable row level security;
alter table public.studio_messages enable row level security;
drop policy if exists "studio_tasks_read_own" on public.studio_tasks;
drop policy if exists "studio_messages_read_own" on public.studio_messages;
create policy "studio_tasks_read_own" on public.studio_tasks for select to authenticated using (user_id = (select auth.uid()));
create policy "studio_messages_read_own" on public.studio_messages for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete, truncate on public.studio_tasks, public.studio_messages from anon, authenticated;

-- 3. Refs: up to 20 of {"type":"asset","id":"<Sprite Drop asset id>"} or {"type":"commit"|"pr"|"url","url":"https://..."}.
--    Asset ids must be this owner's assets; files are referenced, never copied.
create or replace function public.studio_check_refs(p_refs jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
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
$$;

-- 4. Create a task. Same request_key again = the original task back, not a second task.
create or replace function public.studio_create_task(
  p_request_key text, p_project text, p_title text, p_brief text,
  p_turn text default null, p_refs jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
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
  if t.id is null then  -- a parallel retry won the race
    select * into t from public.studio_tasks where user_id = uid and request_key = p_request_key;
    return jsonb_build_object('duplicate', true, 'task', to_jsonb(t));
  end if;
  return jsonb_build_object('duplicate', false, 'task', to_jsonb(t));
end;
$$;

-- 5. Post a message, optionally changing status/turn in the same step.
--    A status/turn change needs p_expected_version = the task's version, or nothing is written
--    and the reply says conflict with the latest task.
create or replace function public.studio_post_message(
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
$$;

revoke all on function public.studio_current_agent() from public, anon;
revoke all on function public.studio_check_refs(jsonb) from public, anon;
revoke all on function public.studio_create_task(text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.studio_post_message(uuid, text, text, text, jsonb, text, text, integer) from public, anon;
grant execute on function public.studio_current_agent() to authenticated;
grant execute on function public.studio_create_task(text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.studio_post_message(uuid, text, text, text, jsonb, text, text, integer) to authenticated;
