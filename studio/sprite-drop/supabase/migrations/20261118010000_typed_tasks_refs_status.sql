-- spitz.dev Phases 2 + 3 (database half). NOT APPLIED. Needs 20261118000000_worker_identities first.
--
-- Phase 2: typed tasks and required references
--   * tasks get job_type (new | refine | pixel_edit | composite | text) and spec (JSON the validator reads).
--   * required references live in studio_task_refs, each with a role and the checksum recorded when attached.
--   * lifecycle without circular steps: create the task on spitz / claude_thread (or with no turn), attach refs,
--     then hand it on. A handoff to chatgpt_chat, openai_worker or claude is REFUSED until the task is ready:
--       refine / pixel_edit / composite need a required "source" ref (composite: plus at least one more) and a spec;
--       every required ref must still exist with the same checksum.
--     create_task can do all three steps in one call (p_required_refs), and fails as a whole if not ready, so no
--     wake is ever sent for an incomplete task (the queued wake rolls back with it).
--   * routing by capability: openai_worker is refused for refine / pixel_edit / composite and for any task with
--     required refs, because today it sends text only to the image model (Phase 5 may widen this).
--   * refs can only change while the task sits with spitz or claude_thread (or has no turn), never mid-run.
--   * reference gate: get_asset logs (task, asset, app). Saving an image onto a task with required refs is refused
--     until the SAME VERIFIED APP fetched every required ref after it was attached. The asset's evidence records
--     what was fetched and says plainly that supplying the refs to the image model is NOT verified.
--
-- Phase 3: asset status
--   * studio_assets.status: draft | failed | approved | ready.
--   * studio_validations: validator results as submitted (sha256 must match the stored asset). The server stores
--     the result; it does not re-run the validator, and says so.
--   * studio_approvals: visual approval, by spitz only. Kody approves IN THE CLAUDE THREAD that puts the art in the
--     game (his choice, 2026-11-17): the thread shows him the exact file, he says approve, and the thread records it
--     with his own words and the file's sha256. Only claude.ai acting as claude_thread may record it; the Claude worker,
--     ChatGPT and the dashboard cannot. The server cannot see who typed the words, so it stores them as quoted.
--   * "ready" is refused unless the newest validation for the asset's exact sha256 is PASS and spitz approved that
--     same sha256. Enforced by a trigger, so no code path can skip it.

begin;

alter table public.studio_tasks
  add column if not exists job_type text check (job_type in ('new', 'refine', 'pixel_edit', 'composite', 'text')),
  add column if not exists spec jsonb check (spec is null or jsonb_typeof(spec) = 'object');

create table if not exists public.studio_task_refs (
  task_id uuid not null references public.studio_tasks(id) on delete cascade,
  asset_id uuid not null references public.studio_assets(id),
  role text not null check (role in ('source', 'style', 'size', 'layout', 'other')),
  required boolean not null default true,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  added_by text not null, added_app text not null,
  added_at timestamptz not null default clock_timestamp(),
  primary key (task_id, asset_id));
alter table public.studio_task_refs enable row level security;
create policy studio_task_refs_owner_read on public.studio_task_refs for select to authenticated
  using (exists (select 1 from public.studio_tasks t where t.id = task_id and t.user_id = auth.uid()));

create table if not exists public.studio_asset_fetches (
  id bigserial primary key, task_id uuid not null references public.studio_tasks(id) on delete cascade,
  asset_id uuid not null references public.studio_assets(id) on delete cascade,
  agent text not null, app text not null, at timestamptz not null default clock_timestamp());
alter table public.studio_asset_fetches enable row level security;
create policy studio_asset_fetches_owner_read on public.studio_asset_fetches for select to authenticated
  using (exists (select 1 from public.studio_tasks t where t.id = task_id and t.user_id = auth.uid()));

alter table public.studio_assets
  add column if not exists status text not null default 'draft' check (status in ('draft', 'failed', 'approved', 'ready')),
  add column if not exists evidence jsonb;

create table if not exists public.studio_validations (
  id bigserial primary key, asset_id uuid not null references public.studio_assets(id) on delete cascade,
  sha256 text not null, result text not null check (result in ('PASS', 'FAIL', 'INDETERMINATE', 'SPEC ERROR')),
  spec jsonb, record jsonb not null, validator text not null,
  by_agent text not null, by_app text not null, at timestamptz not null default clock_timestamp());
alter table public.studio_validations enable row level security;
create policy studio_validations_owner_read on public.studio_validations for select to authenticated
  using (exists (select 1 from public.studio_assets a where a.id = asset_id and a.user_id = auth.uid()));

create table if not exists public.studio_approvals (
  id bigserial primary key, asset_id uuid not null references public.studio_assets(id) on delete cascade,
  sha256 text not null, verdict text not null check (verdict in ('approved', 'rejected')), note text,
  by_agent text not null, by_app text not null, at timestamptz not null default clock_timestamp());
alter table public.studio_approvals enable row level security;
create policy studio_approvals_owner_read on public.studio_approvals for select to authenticated
  using (exists (select 1 from public.studio_assets a where a.id = asset_id and a.user_id = auth.uid()));

-- ---------- readiness ----------
create or replace function public.studio_task_readiness(p_task_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare t public.studio_tasks; missing text[] := '{}'; r record; n_src int; n_req int;
begin
  select * into t from public.studio_tasks where id = p_task_id;
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  select count(*) filter (where role = 'source' and required), count(*) filter (where required)
    into n_src, n_req from public.studio_task_refs where task_id = t.id;
  if t.job_type in ('refine', 'pixel_edit', 'composite') then
    if n_src = 0 then missing := array_append(missing, format('a required "source" reference (the image a %s job starts from)', t.job_type)); end if;
    if t.job_type = 'composite' and n_req < 2 then missing := missing || 'a composite needs the base plus at least one more required reference'::text; end if;
    if t.spec is null then missing := array_append(missing, format('a spec (what the validator checks) for this %s job', t.job_type)); end if;
  end if;
  for r in select x.asset_id, x.sha256, x.role, a.sha256 as now_sha, a.user_id
             from public.studio_task_refs x left join public.studio_assets a on a.id = x.asset_id
            where x.task_id = t.id and x.required loop
    if r.now_sha is null or r.user_id <> t.user_id then missing := array_append(missing, format('reference %s (%s) is not available', r.asset_id, r.role));
    elsif r.now_sha <> r.sha256 then missing := array_append(missing, format('reference %s (%s) changed since it was attached', r.asset_id, r.role)); end if;
  end loop;
  return jsonb_build_object('ready', cardinality(missing) = 0, 'job_type', t.job_type, 'missing', to_jsonb(missing),
    'required_refs', (select coalesce(jsonb_agg(jsonb_build_object('asset_id', asset_id, 'role', role, 'sha256', sha256) order by added_at), '[]')
                        from public.studio_task_refs where task_id = t.id and required));
end $$;

-- handoff gate + capability routing (BEFORE, so it runs ahead of every wake trigger and aborts them)
create or replace function public.studio_tasks_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare rd jsonb;
begin
  if new.status = 'open' and new.turn in ('chatgpt_chat', 'openai_worker', 'claude')
     and (tg_op = 'INSERT' or old.turn is distinct from new.turn or old.status is distinct from new.status) then
    if new.turn = 'openai_worker' and (new.job_type in ('refine', 'pixel_edit', 'composite')
        or exists (select 1 from public.studio_task_refs x where x.task_id = new.id and x.required)) then
      raise exception 'The OpenAI API worker cannot take this task: it sends text only to the image model, so it cannot use required references or keep existing pixels. Hand it to chatgpt_chat, claude or claude_thread.' using errcode = '22023';
    end if;
    if tg_op = 'INSERT' and new.job_type in ('refine', 'pixel_edit', 'composite') then
      raise exception 'A % task needs its references before anyone works on it: create it with turn spitz or claude_thread (or pass required_refs), attach the references, then hand it on.', new.job_type using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' then
      rd := public.studio_task_readiness(new.id);
      if not (rd ->> 'ready')::boolean then
        raise exception 'Not ready to hand on. Missing: %', array_to_string(array(select jsonb_array_elements_text(rd -> 'missing')), '; ') using errcode = '22023';
      end if;
    end if;
  end if;
  return new;
end $$;
drop trigger if exists studio_tasks_gate on public.studio_tasks;
create trigger studio_tasks_gate before insert or update on public.studio_tasks for each row execute function public.studio_tasks_gate();

-- ---------- references ----------
create or replace function public.studio_attach_ref(p_task_id uuid, p_asset_id uuid, p_role text, p_required boolean default true, p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.studio_resolve_author(p_as); app text := public.studio_current_app(); t public.studio_tasks; a public.studio_assets;
begin
  select * into t from public.studio_tasks where id = p_task_id and user_id = auth.uid() for update;
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  if t.status = 'open' and t.turn in ('chatgpt_chat', 'openai_worker', 'claude') then
    raise exception 'References can only change while the task is with spitz or claude_thread (it is with % now).', t.turn using errcode = '22023';
  end if;
  select * into a from public.studio_assets where id = p_asset_id and user_id = auth.uid();
  if not found then raise exception 'No Sprite Drop asset with id %', p_asset_id using errcode = '22023'; end if;
  insert into public.studio_task_refs (task_id, asset_id, role, required, sha256, added_by, added_app)
  values (t.id, a.id, p_role, coalesce(p_required, true), a.sha256, me, app)
  on conflict (task_id, asset_id) do update set role = excluded.role, required = excluded.required, sha256 = excluded.sha256,
    added_by = excluded.added_by, added_app = excluded.added_app, added_at = clock_timestamp();
  return public.studio_task_readiness(t.id);
end $$;

create or replace function public.studio_detach_ref(p_task_id uuid, p_asset_id uuid, p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.studio_resolve_author(p_as); t public.studio_tasks;
begin
  select * into t from public.studio_tasks where id = p_task_id and user_id = auth.uid() for update;
  if not found then raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  if t.status = 'open' and t.turn in ('chatgpt_chat', 'openai_worker', 'claude') then
    raise exception 'References can only change while the task is with spitz or claude_thread (it is with % now).', t.turn using errcode = '22023';
  end if;
  delete from public.studio_task_refs where task_id = t.id and asset_id = p_asset_id;
  return public.studio_task_readiness(t.id);
end $$;

create or replace function public.studio_log_fetch(p_asset_id uuid, p_task_id uuid, p_as text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.studio_tasks where id = p_task_id and user_id = auth.uid()) then
    raise exception 'No task with id %', p_task_id using errcode = '22023'; end if;
  if not exists (select 1 from public.studio_assets where id = p_asset_id and user_id = auth.uid()) then
    raise exception 'No Sprite Drop asset with id %', p_asset_id using errcode = '22023'; end if;
  insert into public.studio_asset_fetches (task_id, asset_id, agent, app)
  values (p_task_id, p_asset_id, public.studio_current_agent(p_as), public.studio_current_app());
end $$;

-- delivery gate on every new image (BEFORE INSERT on studio_assets)
create or replace function public.studio_assets_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks; v_app text; missing text[]; fetched jsonb;
begin
  new.status := 'draft';   -- every new image starts as a draft, whatever the caller sent
  select * into t from public.studio_tasks where id::text = new.task_id;
  if not found or not exists (select 1 from public.studio_task_refs x where x.task_id = t.id and x.required) then return new; end if;
  if auth.uid() is null then
    raise exception 'This task has required references; the API worker cannot use references yet, so it cannot deliver here.' using errcode = '22023';
  end if;
  v_app := public.studio_current_app();
  select array_agg(format('%s (%s)', x.asset_id, x.role)) into missing from public.studio_task_refs x
   where x.task_id = t.id and x.required
     and not exists (select 1 from public.studio_asset_fetches f where f.task_id = t.id and f.asset_id = x.asset_id and f.app = v_app and f.at >= x.added_at);
  if missing is not null then
    raise exception 'Fetch every required reference for task % with get_asset (pass task_id) before delivering. Not fetched yet: %', t.id, array_to_string(missing, ', ') using errcode = '22023';
  end if;
  select jsonb_agg(jsonb_build_object('asset_id', x.asset_id, 'role', x.role, 'fetched_at',
           (select max(f.at) from public.studio_asset_fetches f where f.task_id = t.id and f.asset_id = x.asset_id and f.app = v_app)))
    into fetched from public.studio_task_refs x where x.task_id = t.id and x.required;
  new.evidence := jsonb_build_object('task_id', t.id, 'delivered_by_app', v_app, 'required_refs_fetched_before_delivery', fetched,
    'refs_supplied_to_image_model', 'not verified: the server only sees that the references were fetched');
  return new;
end $$;
drop trigger if exists studio_assets_gate on public.studio_assets;
create trigger studio_assets_gate before insert on public.studio_assets for each row execute function public.studio_assets_gate();

-- ---------- validation, approval, ready ----------
create or replace function public.studio_record_validation(p_asset_id uuid, p_sha256 text, p_result text, p_spec jsonb, p_record jsonb, p_validator text, p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare me text := public.studio_resolve_author(p_as); app text := public.studio_current_app(); a public.studio_assets; v public.studio_validations;
begin
  select * into a from public.studio_assets where id = p_asset_id and user_id = auth.uid() for update;
  if not found then raise exception 'No Sprite Drop asset with id %', p_asset_id using errcode = '22023'; end if;
  if p_sha256 is distinct from a.sha256 then
    raise exception 'This validation is for a different file (sha256 %), the stored asset is %', left(coalesce(p_sha256, '?'), 12), left(a.sha256, 12) using errcode = '22023';
  end if;
  insert into public.studio_validations (asset_id, sha256, result, spec, record, validator, by_agent, by_app)
  values (a.id, a.sha256, p_result, p_spec, p_record, p_validator, me, app) returning * into v;
  if p_result <> 'PASS' and a.status in ('draft', 'approved') then update public.studio_assets set status = 'failed' where id = a.id; end if;
  return jsonb_build_object('validation', to_jsonb(v), 'note', 'Stored as submitted. The server does not re-run the validator.');
end $$;

drop function if exists public.studio_review_asset(uuid, text, text, text, text);
create or replace function public.studio_review_asset(p_asset_id uuid, p_verdict text, p_note text, p_sha256 text, p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare app text := public.studio_current_app(); me text; a public.studio_assets;
begin
  if app <> 'claude.ai' then
    raise exception 'Kody approves art in the Claude thread that puts it in the game, not here.' using errcode = '42501'; end if;
  me := public.studio_resolve_author(p_as);
  if me <> 'claude_thread' then
    raise exception 'Only a Claude project thread records Kody''s approval; the Claude worker cannot.' using errcode = '42501'; end if;
  if p_verdict is null or p_verdict not in ('approved', 'rejected') then
    raise exception 'verdict must be approved or rejected' using errcode = '22023'; end if;
  if length(trim(coalesce(p_note, ''))) < 2 then
    raise exception 'Quote Kody''s own words in note (for example: "approve").' using errcode = '22023'; end if;
  select * into a from public.studio_assets where id = p_asset_id and user_id = auth.uid() for update;
  if not found then raise exception 'No Sprite Drop asset with id %', p_asset_id using errcode = '22023'; end if;
  if p_sha256 is distinct from a.sha256 then
    raise exception 'Kody saw a different file (sha256 %), the stored asset is %. Show him this exact file first.', left(coalesce(p_sha256, '?'), 12), left(a.sha256, 12) using errcode = '22023'; end if;
  insert into public.studio_approvals (asset_id, sha256, verdict, note, by_agent, by_app) values (a.id, a.sha256, p_verdict, p_note, 'spitz', 'claude_thread');
  update public.studio_assets set status = case when p_verdict = 'approved' then (case when status = 'ready' then 'ready' else 'approved' end) else 'failed' end where id = a.id;
  return jsonb_build_object('status', (select status from public.studio_assets where id = a.id), 'sha256', a.sha256,
    'note', 'Recorded as Kody''s words, quoted by the Claude thread. The server cannot see who typed them.');
end $$;

create or replace function public.studio_mark_ready(p_asset_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.studio_assets where id = p_asset_id and user_id = auth.uid()) then
    raise exception 'No Sprite Drop asset with id %', p_asset_id using errcode = '22023'; end if;
  update public.studio_assets set status = 'ready' where id = p_asset_id;   -- the trigger decides
  return jsonb_build_object('status', 'ready');
end $$;

create or replace function public.studio_assets_status_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare last_v text; ok_approval boolean;
begin
  if new.sha256 is distinct from old.sha256 then raise exception 'An asset''s bytes never change; save a new asset instead.' using errcode = '22023'; end if;
  if new.status = 'ready' and old.status is distinct from 'ready' then
    select result into last_v from public.studio_validations where asset_id = new.id and sha256 = new.sha256 order by id desc limit 1;
    select exists (select 1 from public.studio_approvals where asset_id = new.id and sha256 = new.sha256 and verdict = 'approved' and by_agent = 'spitz'
                   and id = (select max(id) from public.studio_approvals where asset_id = new.id and sha256 = new.sha256)) into ok_approval;
    if last_v is distinct from 'PASS' or not ok_approval then
      raise exception 'Not ready: needs the newest validation of this exact file to be PASS (now: %) and spitz''s approval of it (now: %).',
        coalesce(last_v, 'none'), case when ok_approval then 'approved' else 'missing' end using errcode = '22023';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists studio_assets_status_guard on public.studio_assets;
create trigger studio_assets_status_guard before update on public.studio_assets for each row execute function public.studio_assets_status_guard();

-- ---------- create_task: job type, spec and required refs in one call ----------
drop function if exists public.studio_create_task(text, text, text, text, text, jsonb, text);
create function public.studio_create_task(p_request_key text, p_project text, p_title text, p_brief text,
  p_turn text default null, p_refs jsonb default '[]', p_as text default null,
  p_job_type text default null, p_spec jsonb default null, p_required_refs jsonb default '[]')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me text := public.studio_resolve_author(p_as);
  app text := public.studio_current_app();
  uid uuid := auth.uid();
  t public.studio_tasks; r jsonb; rd jsonb;
begin
  perform public.studio_check_turn(p_turn);
  select * into t from public.studio_tasks where user_id = uid and request_key = p_request_key;
  if found then
    if t.project <> p_project or t.title <> p_title then
      raise exception 'request_key % was already used for a different task', p_request_key using errcode = '22023';
    end if;
    return jsonb_build_object('duplicate', true, 'task', to_jsonb(t), 'readiness', public.studio_task_readiness(t.id));
  end if;
  if jsonb_typeof(coalesce(p_required_refs, '[]')) <> 'array' then raise exception 'required_refs must be a list' using errcode = '22023'; end if;
  -- 1. create with no turn, 2. attach refs, 3. hand on (the gate checks readiness; failure rolls everything back)
  insert into public.studio_tasks (user_id, project, title, brief, turn, created_by, created_by_app, refs, request_key, job_type, spec)
  values (uid, p_project, p_title, p_brief, null, me, app, public.studio_check_refs(p_refs), p_request_key, p_job_type, p_spec)
  returning * into t;
  for r in select * from jsonb_array_elements(coalesce(p_required_refs, '[]')) loop
    perform public.studio_attach_ref(t.id, (r ->> 'asset_id')::uuid, coalesce(r ->> 'role', 'source'), coalesce((r ->> 'required')::boolean, true), p_as);
  end loop;
  if p_turn is not null then
    update public.studio_tasks set turn = p_turn where id = t.id returning * into t;
  end if;
  rd := public.studio_task_readiness(t.id);
  return jsonb_build_object('duplicate', false, 'task', to_jsonb(t), 'readiness', rd);
end $$;

-- ---------- grants ----------
revoke all on function public.studio_create_task(text, text, text, text, text, jsonb, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.studio_create_task(text, text, text, text, text, jsonb, text, text, jsonb, jsonb) to authenticated, service_role;
revoke all on function public.studio_task_readiness(uuid), public.studio_attach_ref(uuid, uuid, text, boolean, text), public.studio_detach_ref(uuid, uuid, text),
  public.studio_log_fetch(uuid, uuid, text), public.studio_record_validation(uuid, text, text, jsonb, jsonb, text, text),
  public.studio_review_asset(uuid, text, text, text, text), public.studio_mark_ready(uuid) from public, anon;
grant execute on function public.studio_task_readiness(uuid), public.studio_attach_ref(uuid, uuid, text, boolean, text), public.studio_detach_ref(uuid, uuid, text),
  public.studio_log_fetch(uuid, uuid, text), public.studio_record_validation(uuid, text, text, jsonb, jsonb, text, text),
  public.studio_review_asset(uuid, text, text, text, text), public.studio_mark_ready(uuid) to authenticated, service_role;
revoke all on function public.studio_tasks_gate(), public.studio_assets_gate(), public.studio_assets_status_guard() from public, anon, authenticated;

create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;

commit;
