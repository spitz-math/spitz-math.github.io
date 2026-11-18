-- spitz.dev M1: locked approvals (Kody's go, 2026-11-18). Needs 20261118000000 and 20261118010000 first.
--
-- The rule: a picture can only be used once Kody approved that exact file, signed in on spitz.dev himself.
--   * Every new picture is HELD. Held pictures cannot be attached as task references, cited in task messages,
--     fetched for a task, or marked ready. An AI can still SEE a held picture (get_asset shows a preview of the
--     stored file), but nothing it does with it counts until Kody approves.
--   * Approvals are written by studio_approve() only, and a trigger on studio_approvals re-checks the same rules for
--     every insert, whatever code path tries it:
--       - a signed-in user (auth.uid), role authenticated, not anonymous;
--       - NO OAuth client in the token and NO OAuth client on the sign-in session (auth.sessions.oauth_client_id).
--         ChatGPT and Claude connect through OAuth, so their tokens always carry one. The workers run with the
--         server key and have no user at all. So none of them can approve.
--       - the checksum the page displayed equals the stored file's checksum.
--   * Each approval records asset id, full sha256, the user id and session id read from the request (never from
--     arguments), the database time, the method and the device label. Approvals can never be changed or deleted.
--   * "Request changes" and "Reject" make the file REJECTED for good (a fix is a new file). Changes write Kody's note
--     onto the task and hand it back to whoever made the file. If that is his ChatGPT chat, the task says plainly that
--     it waits for him to open ChatGPT: that chat cannot be started automatically.
--   * Existing pictures keep their status (draft = made before this rule, still usable as before). Existing approvals
--     stay valid. The Claude thread can no longer record approvals (studio_review_asset now refuses).
--   * Small additions for the approval page: parent_id (the approved picture a new one was made from) and anim
--     (frame width, height and time for a sprite sheet), set by drop_asset.
--
-- Known limit, stated so nobody is surprised: anyone with admin access to the Supabase project (the dashboard,
-- the SQL editor, a deploy key) can bypass any database rule. These rules bind the AIs' everyday access.

begin;

-- ---------- asset status: held + rejected, who made it, parent, animation ----------
alter table public.studio_assets drop constraint if exists studio_assets_status_check;
alter table public.studio_assets add constraint studio_assets_status_check
  check (status in ('held', 'draft', 'failed', 'approved', 'ready', 'rejected'));
alter table public.studio_assets
  add column if not exists made_by text,
  add column if not exists made_by_app text,
  add column if not exists parent_id uuid references public.studio_assets(id),
  add column if not exists anim jsonb check (anim is null or (jsonb_typeof(anim) = 'object'
    and (anim ->> 'frame_w')::int > 0 and (anim ->> 'frame_h')::int > 0 and (anim ->> 'frame_ms')::int between 16 and 5000));

-- ---------- approvals: who, which session, how ----------
alter table public.studio_approvals
  add column if not exists user_id uuid,
  add column if not exists session_id uuid,
  add column if not exists method text,
  add column if not exists device text;
alter table public.studio_approvals drop constraint if exists studio_approvals_verdict_check;
alter table public.studio_approvals add constraint studio_approvals_verdict_check check (verdict in ('approved', 'changes', 'rejected'));

-- Raises unless the request comes from Kody signed in directly (a browser session, not an OAuth app, not a server key).
create or replace function public.studio_human_session()
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := auth.jwt(); sid uuid; s record;
begin
  if auth.uid() is null then
    raise exception 'Only Kody can approve, signed in on spitz.dev. This request has no signed-in user (a server key or a worker).' using errcode = '42501'; end if;
  if coalesce(c ->> 'role', '') <> 'authenticated' then
    raise exception 'Only Kody can approve, signed in on spitz.dev.' using errcode = '42501'; end if;
  if nullif(c ->> 'client_id', '') is not null then
    raise exception 'Approvals cannot come from an app connected through OAuth (ChatGPT or Claude). Kody approves on spitz.dev.' using errcode = '42501'; end if;
  if coalesce((c ->> 'is_anonymous')::boolean, false) then
    raise exception 'Anonymous sessions cannot approve.' using errcode = '42501'; end if;
  begin sid := (c ->> 'session_id')::uuid; exception when others then sid := null; end;
  if sid is null then raise exception 'This request has no sign-in session, so it cannot approve.' using errcode = '42501'; end if;
  select * into s from auth.sessions where id = sid;
  if not found or s.user_id is distinct from auth.uid() then
    raise exception 'This sign-in session no longer exists. Sign in on spitz.dev again.' using errcode = '42501'; end if;
  if s.oauth_client_id is not null then
    raise exception 'This session belongs to an app connected through OAuth, not to Kody''s own sign-in.' using errcode = '42501'; end if;
  if s.not_after is not null and s.not_after < now() then
    raise exception 'This sign-in session has ended. Sign in on spitz.dev again.' using errcode = '42501'; end if;
  return sid;
end $$;

-- Every approval row, however it is written, must come from that session and match the stored file. Rows are permanent.
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
drop trigger if exists studio_approvals_guard on public.studio_approvals;
create trigger studio_approvals_guard before insert or update or delete on public.studio_approvals for each row execute function public.studio_approvals_guard();
create or replace function public.studio_approvals_no_truncate()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Approvals are permanent: they cannot be changed or deleted.' using errcode = '42501'; end $$;
drop trigger if exists studio_approvals_no_truncate on public.studio_approvals;
create trigger studio_approvals_no_truncate before truncate on public.studio_approvals for each statement execute function public.studio_approvals_no_truncate();

-- ---------- new pictures are held; record who made them; parent must be usable ----------
create or replace function public.studio_assets_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks; v_app text; missing text[]; fetched jsonb; p public.studio_assets;
begin
  new.status := 'held';   -- every new picture waits for Kody, whatever the caller sent
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

-- ---------- status changes only follow a recorded human decision ----------
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

-- ---------- held or rejected pictures cannot be used ----------
create or replace function public.studio_usable(p_asset_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
declare st text;
begin
  select status into st from public.studio_assets where id = p_asset_id and user_id = auth.uid();
  if st = 'held' then
    raise exception 'Picture % is waiting for Kody''s approval, so it cannot be used yet. Show Kody the preview and this link: https://dev.spitzmath.com/approve/?id=%', p_asset_id, p_asset_id using errcode = '22023'; end if;
  if st = 'rejected' then
    raise exception 'Picture % was rejected by Kody and can never be used. Make a new file.', p_asset_id using errcode = '22023'; end if;
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
      perform public.studio_usable((r ->> 'id')::uuid);
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
  perform public.studio_usable(a.id);
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
  perform public.studio_usable(p_asset_id);
  insert into public.studio_asset_fetches (task_id, asset_id, agent, app)
  values (p_task_id, p_asset_id, public.studio_current_agent(p_as), public.studio_current_app());
end $$;

-- A held reference stays out of readiness too (in case one was attached before this rule).
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

-- ---------- the Claude thread no longer records approvals ----------
create or replace function public.studio_review_asset(p_asset_id uuid, p_verdict text, p_note text, p_sha256 text, p_as text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  raise exception 'Approvals now happen only on spitz.dev, with Kody signed in. Send Kody this link: https://dev.spitzmath.com/approve/?id=%', p_asset_id using errcode = '42501';
end $$;

-- ---------- Kody's decision ----------
create or replace function public.studio_approve(p_asset_id uuid, p_sha256 text, p_verdict text, p_note text default null,
  p_method text default 'spitz_dev_page', p_device text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  sid uuid := public.studio_human_session();
  uid uuid := auth.uid();
  a public.studio_assets; t public.studio_tasks; ap public.studio_approvals;
  back_to text; still_held int; body text; posted jsonb; handoff text := null; handoff_error text := null; next_step text;
begin
  if p_verdict is null or p_verdict not in ('approved', 'changes', 'rejected') then
    raise exception 'verdict must be approved, changes or rejected' using errcode = '22023'; end if;
  if p_method is null or p_method not in ('spitz_dev_page', 'push', 'batch_page') then
    raise exception 'method must be spitz_dev_page, push or batch_page' using errcode = '22023'; end if;
  if p_verdict = 'changes' and length(trim(coalesce(p_note, ''))) < 2 then
    raise exception 'Say what to change.' using errcode = '22023'; end if;
  select * into a from public.studio_assets where id = p_asset_id and user_id = uid for update;
  if not found then raise exception 'No picture with id %', p_asset_id using errcode = '22023'; end if;
  if p_sha256 is distinct from a.sha256 then
    raise exception 'The page showed a different file (%) from the stored one (%). Reload and look again.', left(coalesce(p_sha256, '?'), 12), left(a.sha256, 12) using errcode = '22023'; end if;
  if a.status in ('approved', 'ready') then
    return jsonb_build_object('status', a.status, 'sha256', a.sha256, 'already', true, 'next', 'Already approved. Approved pictures never change.'); end if;
  if a.status = 'rejected' then
    raise exception 'This picture was already rejected and stays rejected. A fix is a new file.' using errcode = '22023'; end if;

  insert into public.studio_approvals (asset_id, sha256, verdict, note, by_agent, by_app, user_id, session_id, method, device)
  values (a.id, a.sha256, p_verdict, nullif(left(trim(coalesce(p_note, '')), 2000), ''), 'spitz', 'spitz.dev', uid, sid, p_method, left(p_device, 200))
  returning * into ap;
  update public.studio_assets set status = case when p_verdict = 'approved' then 'approved' else 'rejected' end where id = a.id;

  -- tell the task, and hand it on when that is clear
  select * into t from public.studio_tasks where id::text = a.task_id and user_id = uid;
  if found and t.status = 'open' then
    select count(*) into still_held from public.studio_assets where task_id = a.task_id and user_id = uid and status = 'held';
    back_to := case a.made_by when 'chatgpt_chat' then 'chatgpt_chat' when 'openai_worker' then 'openai_worker' when 'claude' then 'claude' else null end;
    if p_verdict = 'approved' then
      body := format('Approved on spitz.dev: %s (%s, sha256 %s).', a.original_name, a.id, left(a.sha256, 12));
      if t.turn = 'spitz' and still_held = 0 then handoff := 'claude'; end if;
    else
      body := format('%s on spitz.dev: %s (%s, sha256 %s). This file can never be used. %s',
                     case p_verdict when 'changes' then 'Changes requested' else 'Rejected' end, a.original_name, a.id, left(a.sha256, 12),
                     case when ap.note is not null then 'Kody: ' || ap.note else '' end);
      if p_verdict = 'changes' and still_held = 0 and back_to is not null then handoff := back_to; end if;
    end if;
    begin
      posted := public.studio_post_message(t.id, 'approve-' || ap.id, 'decision', body, '[]'::jsonb, null, handoff, case when handoff is null then null else t.version end, null);
      if coalesce((posted ->> 'conflict')::boolean, false) then raise exception 'the task changed at the same moment'; end if;
    exception when others then
      handoff_error := sqlerrm; handoff := null;
      posted := public.studio_post_message(t.id, 'approve-' || ap.id, 'decision', body, '[]'::jsonb, null, null, null, null);
    end;
  end if;

  next_step := case
    when p_verdict = 'approved' then case when handoff = 'claude' then 'Approved. The Claude worker picks the task up now.' else 'Approved.' end
    when handoff = 'chatgpt_chat' then 'Your note is on the task. Your ChatGPT chat will NOT start by itself: open ChatGPT and say "continue the task ' || coalesce(t.title, a.task_id) || '".'
    when handoff in ('claude', 'openai_worker') then 'Your note is on the task, and ' || case handoff when 'claude' then 'the Claude worker' else 'the ChatGPT worker' end || ' starts on it now.'
    when p_verdict = 'changes' then 'Your note is on the task. Nobody was started automatically' || case when handoff_error is not null then ' (' || handoff_error || ')' else '' end || '.'
    else 'Rejected. Nobody was started automatically.' end;
  return jsonb_build_object('status', (select status from public.studio_assets where id = a.id), 'sha256', a.sha256, 'approval_id', ap.id,
    'at', ap.at, 'handed_to', handoff, 'needs_you_in_chatgpt', handoff = 'chatgpt_chat', 'next', next_step);
end $$;

-- ---------- grants ----------
revoke all on function public.studio_human_session(), public.studio_approve(uuid, text, text, text, text, text), public.studio_usable(uuid) from public, anon;
grant execute on function public.studio_approve(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.studio_human_session(), public.studio_usable(uuid) to authenticated, service_role;
revoke all on function public.studio_approvals_guard(), public.studio_approvals_no_truncate() from public, anon, authenticated;
revoke insert, update, delete, truncate on public.studio_approvals from anon, authenticated;

create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1, 'approvals', 2,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;

commit;
