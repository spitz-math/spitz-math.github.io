-- Rollback of 20261118020000_locked_approvals.sql: back to the Phase 2+3 behaviour.
-- Keeps every row and every recorded approval. held -> draft, rejected -> failed, "changes" approvals -> rejected.
-- The new columns stay (unused) so nothing is lost.
begin;
drop trigger if exists studio_approvals_guard on public.studio_approvals;
drop trigger if exists studio_approvals_no_truncate on public.studio_approvals;
alter table public.studio_assets disable trigger studio_assets_status_guard;
update public.studio_assets set status = 'draft' where status = 'held';
update public.studio_assets set status = 'failed' where status = 'rejected';
alter table public.studio_assets enable trigger studio_assets_status_guard;
alter table public.studio_assets drop constraint if exists studio_assets_status_check;
alter table public.studio_assets add constraint studio_assets_status_check check (status in ('draft', 'failed', 'approved', 'ready'));
update public.studio_approvals set verdict = 'rejected' where verdict = 'changes';
alter table public.studio_approvals drop constraint if exists studio_approvals_verdict_check;
alter table public.studio_approvals add constraint studio_approvals_verdict_check check (verdict in ('approved', 'rejected'));
drop function if exists public.studio_approve(uuid, text, text, text, text, text);
drop function if exists public.studio_approvals_guard();
drop function if exists public.studio_approvals_no_truncate();

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

create or replace function public.studio_check_refs(p_refs jsonb)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
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
end $$;

drop function if exists public.studio_usable(uuid);
drop function if exists public.studio_human_session();
create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;
commit;
