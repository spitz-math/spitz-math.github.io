-- Undo 20261118030000_parents_and_proofs.sql: back to M1 (locked approvals) exactly.
-- Pictures approved by a proof stay approved (their approval rows stay; the proof link is dropped with the table).
begin;

drop trigger if exists studio_approvals_parent_first on public.studio_approvals;
drop function if exists public.studio_approvals_parent_first();
drop function if exists public.studio_parent_ok(uuid);
drop function if exists public.studio_asset_lineage(uuid);
drop function if exists public.studio_record_proof(uuid, text, text, text, boolean, text, jsonb, text);
alter table public.studio_approvals drop column if exists proof_id;
drop trigger if exists studio_proofs_permanent on public.studio_proofs;
drop table if exists public.studio_proofs;
drop function if exists public.studio_proofs_permanent();

-- M1 versions of the changed functions
create or replace function public.studio_approvals_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sid uuid;
begin
  if tg_op <> 'INSERT' then raise exception 'Approvals are permanent: they cannot be changed or deleted.' using errcode = '42501'; end if;
  sid := public.studio_human_session();
  if new.user_id is distinct from auth.uid() or new.session_id is distinct from sid then
    raise exception 'An approval must record the signed-in user and session that made it.' using errcode = '42501'; end if;
  if new.by_agent is distinct from 'spitz' then raise exception 'Only spitz approves.' using errcode = '42501'; end if;
  if new.sha256 is distinct from (select a.sha256 from public.studio_assets a where a.id = new.asset_id and a.user_id = auth.uid()) then
    raise exception 'The approval''s checksum is not the stored file''s checksum.' using errcode = '42501'; end if;
  new.at := clock_timestamp();
  return new;
end $$;

create or replace function public.studio_assets_status_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare last_v text; last_a public.studio_approvals;
begin
  if new.sha256 is distinct from old.sha256 then raise exception 'An asset''s bytes never change; save a new asset instead.' using errcode = '22023'; end if;
  if new.parent_id is distinct from old.parent_id or new.made_by is distinct from old.made_by or new.made_by_app is distinct from old.made_by_app then
    raise exception 'Where a picture came from never changes.' using errcode = '22023'; end if;
  if new.status is not distinct from old.status then return new; end if;
  select * into last_a from public.studio_approvals where asset_id = new.id and sha256 = new.sha256 order by id desc limit 1;
  if old.status = 'rejected' then
    raise exception 'A rejected picture stays rejected. A fix is a new file.' using errcode = '22023'; end if;
  if new.status = 'approved' and old.status <> 'ready' then
    if last_a.verdict is distinct from 'approved' or last_a.user_id is null then
      raise exception 'Only Kody''s approval on spitz.dev makes a picture approved.' using errcode = '42501'; end if;
  end if;
  if new.status = 'rejected' then
    if last_a.verdict is null or last_a.verdict = 'approved' or last_a.user_id is null then
      raise exception 'Only Kody''s decision on spitz.dev rejects a picture.' using errcode = '42501'; end if;
  end if;
  if old.status = 'held' and new.status not in ('approved', 'rejected') then
    raise exception 'This picture is waiting for Kody''s approval: https://dev.spitzmath.com/approve/?id=%', new.id using errcode = '22023'; end if;
  if new.status = 'ready' then
    select result into last_v from public.studio_validations where asset_id = new.id and sha256 = new.sha256 order by id desc limit 1;
    if last_v is distinct from 'PASS' or last_a.verdict is distinct from 'approved' then
      raise exception 'Not ready: needs the newest validation of this exact file to be PASS (now: %) and Kody''s approval of it (now: %).',
        coalesce(last_v, 'none'), case when last_a.verdict = 'approved' then 'approved' else 'missing' end using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

create or replace function public.studio_assets_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks; v_app text; missing text[]; fetched jsonb; p public.studio_assets;
begin
  new.status := 'held';
  if auth.uid() is null then v_app := 'server';
  else begin v_app := public.studio_current_app(); exception when others then v_app := 'unknown'; end;
  end if;
  new.made_by_app := v_app;
  new.made_by := case v_app when 'server' then 'openai_worker' when 'chatgpt.com' then 'chatgpt_chat' when 'claude.ai' then 'claude'
                            when 'dashboard' then 'spitz' else 'unknown' end;
  if new.parent_id is not null then
    select * into p from public.studio_assets where id = new.parent_id and user_id = new.user_id;
    if not found then raise exception 'made_from: no picture with id %', new.parent_id using errcode = '22023'; end if;
    if p.status in ('held', 'rejected') then
      raise exception 'made_from: picture % is % (not approved), so nothing can be made from it yet.', p.id, p.status using errcode = '22023'; end if;
  end if;
  select * into t from public.studio_tasks where id::text = new.task_id;
  if not found or not exists (select 1 from public.studio_task_refs x where x.task_id = t.id and x.required) then return new; end if;
  if auth.uid() is null then
    raise exception 'This task has required references; the API worker cannot use references yet, so it cannot deliver here.' using errcode = '22023';
  end if;
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
  for r in select x.asset_id, x.sha256, x.role, a.sha256 as now_sha, a.user_id, a.status
             from public.studio_task_refs x left join public.studio_assets a on a.id = x.asset_id
            where x.task_id = t.id and x.required loop
    if r.now_sha is null or r.user_id <> t.user_id then missing := array_append(missing, format('reference %s (%s) is not available', r.asset_id, r.role));
    elsif r.now_sha <> r.sha256 then missing := array_append(missing, format('reference %s (%s) changed since it was attached', r.asset_id, r.role));
    elsif r.status in ('held', 'rejected') then missing := array_append(missing, format('reference %s (%s) is %s, not approved', r.asset_id, r.role, r.status)); end if;
  end loop;
  return jsonb_build_object('ready', cardinality(missing) = 0, 'job_type', t.job_type, 'missing', to_jsonb(missing),
    'required_refs', (select coalesce(jsonb_agg(jsonb_build_object('asset_id', asset_id, 'role', role, 'sha256', sha256) order by added_at), '[]')
                        from public.studio_task_refs where task_id = t.id and required));
end $$;

create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1, 'approvals', 2,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;

commit;
