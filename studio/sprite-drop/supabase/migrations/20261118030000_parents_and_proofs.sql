-- spitz.dev M3: parents and proofs (Kody's go, 2026-11-18). Needs 20261118020000_locked_approvals first.
--
--   * A picture made from another one names it (parent_id, set by drop_asset's made_from). The parent must be APPROVED
--     (or ready): a held, rejected or never-approved (legacy draft/failed) picture cannot be the parent of anything.
--   * Refine, pixel_edit and composite tasks need an APPROVED source reference before they can be handed on.
--   * Proofs: when a child names its parent, Sprite Drop compares the two stored files pixel by pixel and records the
--     result in studio_proofs. Only a pixel-preserving result (identical pixels, trim/pad/shift of the empty border,
--     whole-number nearest-neighbour scale, one frame cut out of an approved sheet) approves the child automatically.
--     That approval is method 'proof', by_agent 'proof', with no user, and points at its proof row. Everything else
--     (1x conversion of an illustration, recolour, redraw, new animation frames) stays held for Kody. Similarity is
--     never recorded as a reason to approve.
--   * Proof rows can only be written by studio_record_proof, which only the server key can call (Sprite Drop calls it
--     with the bytes it just stored and the parent's bytes from storage). A proof approval must point at a proof row
--     written in the same transaction, for the same file, saying pixel_preserving. AIs connected through OAuth
--     (ChatGPT, Claude) and the signed-in dashboard cannot call it.
--   * studio_asset_lineage(id) walks a picture back to its original with every approval or proof on the way.
--
-- Known limit, stated plainly: code holding the server key could call studio_record_proof with a false
-- "pixel_preserving". Today only Sprite Drop's fixed proof code does. Admin access can bypass any rule, as before.

begin;

create table if not exists public.studio_proofs (
  id bigserial primary key,
  asset_id uuid not null references public.studio_assets(id) on delete cascade,
  parent_id uuid not null references public.studio_assets(id),
  asset_sha256 text not null, parent_sha256 text not null,
  kind text not null check (kind in ('identical', 'same_content', 'scale', 'frame_of', 'sheet_of', 'none', 'unsupported')),
  pixel_preserving boolean not null,
  summary text not null, details jsonb not null default '{}'::jsonb,
  checker text not null, txid bigint not null default txid_current(),
  at timestamptz not null default clock_timestamp());
alter table public.studio_proofs enable row level security;
drop policy if exists studio_proofs_owner_read on public.studio_proofs;
create policy studio_proofs_owner_read on public.studio_proofs for select to authenticated
  using (exists (select 1 from public.studio_assets a where a.id = asset_id and a.user_id = auth.uid()));
revoke insert, update, delete, truncate on public.studio_proofs from public, anon, authenticated, service_role;
create or replace function public.studio_proofs_permanent()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'Proofs are permanent.' using errcode = '42501'; end $$;
drop trigger if exists studio_proofs_permanent on public.studio_proofs;
create trigger studio_proofs_permanent before update or delete on public.studio_proofs for each row execute function public.studio_proofs_permanent();

alter table public.studio_approvals add column if not exists proof_id bigint references public.studio_proofs(id);

-- ---------- approvals: Kody's signed-in session, or a same-transaction pixel proof ----------
create or replace function public.studio_approvals_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare sid uuid; pr public.studio_proofs; a public.studio_assets;
begin
  if tg_op <> 'INSERT' then raise exception 'Approvals are permanent: they cannot be changed or deleted.' using errcode = '42501'; end if;
  if new.method = 'proof' then
    if new.by_agent is distinct from 'proof' or new.user_id is not null or new.session_id is not null or new.verdict <> 'approved' then
      raise exception 'A proof approval is approved, by "proof", with no user.' using errcode = '42501'; end if;
    select * into pr from public.studio_proofs where id = new.proof_id;
    select * into a from public.studio_assets where id = new.asset_id;
    if pr.id is null or pr.asset_id <> new.asset_id or pr.asset_sha256 <> new.sha256 or a.sha256 <> new.sha256
       or not pr.pixel_preserving or pr.txid <> txid_current() or pr.parent_id is distinct from a.parent_id then
      raise exception 'A proof approval needs a pixel-preserving proof of this exact file, recorded just now.' using errcode = '42501'; end if;
    new.at := clock_timestamp();
    return new;
  end if;
  sid := public.studio_human_session();
  if new.user_id is distinct from auth.uid() or new.session_id is distinct from sid then
    raise exception 'An approval must record the signed-in user and session that made it.' using errcode = '42501'; end if;
  if new.by_agent is distinct from 'spitz' then raise exception 'Only spitz approves.' using errcode = '42501'; end if;
  if new.proof_id is not null then raise exception 'Kody''s approvals do not carry a proof.' using errcode = '42501'; end if;
  if new.sha256 is distinct from (select x.sha256 from public.studio_assets x where x.id = new.asset_id and x.user_id = auth.uid()) then
    raise exception 'The approval''s checksum is not the stored file''s checksum.' using errcode = '42501'; end if;
  new.at := clock_timestamp();
  return new;
end $$;

-- ---------- status: approved only after Kody's decision or a proof approval ----------
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
    if last_a.verdict is distinct from 'approved' or (last_a.user_id is null and last_a.method is distinct from 'proof') then
      raise exception 'Only Kody''s approval on spitz.dev (or a pixel proof against an approved parent) makes a picture approved.' using errcode = '42501'; end if;
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
      raise exception 'Not ready: needs the newest validation of this exact file to be PASS (now: %) and an approval of it (now: %).',
        coalesce(last_v, 'none'), case when last_a.verdict = 'approved' then 'approved' else 'missing' end using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

-- ---------- a parent must be approved ----------
create or replace function public.studio_assets_gate()
returns trigger language plpgsql security definer set search_path = '' as $$
declare t public.studio_tasks; v_app text; missing text[]; fetched jsonb; p public.studio_assets;
begin
  new.status := 'held';   -- every new picture waits for Kody (or a proof), whatever the caller sent
  if auth.uid() is null then v_app := 'server';
  else begin v_app := public.studio_current_app(); exception when others then v_app := 'unknown'; end;
  end if;
  new.made_by_app := v_app;
  new.made_by := case v_app when 'server' then 'openai_worker' when 'chatgpt.com' then 'chatgpt_chat' when 'claude.ai' then 'claude'
                            when 'dashboard' then 'spitz' else 'unknown' end;
  if new.parent_id is not null then
    select * into p from public.studio_assets where id = new.parent_id and user_id = new.user_id;
    if not found then raise exception 'made_from: no picture with id %', new.parent_id using errcode = '22023'; end if;
    if p.status not in ('approved', 'ready') then
      raise exception 'made_from: picture % is % (not approved), so nothing can be made from it yet.%', p.id, p.status,
        case when p.status in ('held', 'draft', 'failed') then ' Kody approves it at https://dev.spitzmath.com/approve/?id=' || p.id else '' end using errcode = '22023'; end if;
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

-- ---------- refine / pixel_edit / composite need an APPROVED source ----------
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
    elsif r.status in ('held', 'rejected') then missing := array_append(missing, format('reference %s (%s) is %s, not approved', r.asset_id, r.role, r.status));
    elsif r.role = 'source' and t.job_type in ('refine', 'pixel_edit', 'composite') and r.status not in ('approved', 'ready') then
      missing := array_append(missing, format('source %s is %s: Kody approves it first at https://dev.spitzmath.com/approve/?id=%s', r.asset_id, r.status, r.asset_id)); end if;
  end loop;
  return jsonb_build_object('ready', cardinality(missing) = 0, 'job_type', t.job_type, 'missing', to_jsonb(missing),
    'required_refs', (select coalesce(jsonb_agg(jsonb_build_object('asset_id', asset_id, 'role', role, 'sha256', sha256) order by added_at), '[]')
                        from public.studio_task_refs where task_id = t.id and required));
end $$;

-- ---------- Kody approves a child only once its parent is approved ----------
create or replace function public.studio_parent_ok(p_asset_id uuid)
returns void language plpgsql stable security definer set search_path = '' as $$
declare p public.studio_assets;
begin
  select pa.* into p from public.studio_assets c join public.studio_assets pa on pa.id = c.parent_id where c.id = p_asset_id;
  if found and p.status not in ('approved', 'ready') then
    raise exception 'Approve the picture this was made from first (it is %): https://dev.spitzmath.com/approve/?id=%', p.status, p.id using errcode = '22023'; end if;
end $$;
create or replace function public.studio_approvals_parent_first()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.verdict = 'approved' then perform public.studio_parent_ok(new.asset_id); end if;
  return new;
end $$;
drop trigger if exists studio_approvals_parent_first on public.studio_approvals;
create trigger studio_approvals_parent_first before insert on public.studio_approvals for each row execute function public.studio_approvals_parent_first();

-- ---------- proofs (server key only) ----------
create or replace function public.studio_record_proof(p_asset_id uuid, p_asset_sha256 text, p_parent_sha256 text, p_kind text,
  p_pixel_preserving boolean, p_summary text, p_details jsonb, p_checker text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare a public.studio_assets; p public.studio_assets; pr public.studio_proofs; approved boolean := false; why text;
begin
  select * into a from public.studio_assets where id = p_asset_id for update;
  if not found then raise exception 'No picture with id %', p_asset_id using errcode = '22023'; end if;
  if a.parent_id is null then raise exception 'Picture % names no parent, so there is nothing to prove.', a.id using errcode = '22023'; end if;
  select * into p from public.studio_assets where id = a.parent_id;
  if p_asset_sha256 is distinct from a.sha256 or p_parent_sha256 is distinct from p.sha256 then
    raise exception 'The proof was computed on different files from the stored ones.' using errcode = '22023'; end if;
  insert into public.studio_proofs (asset_id, parent_id, asset_sha256, parent_sha256, kind, pixel_preserving, summary, details, checker)
  values (a.id, p.id, a.sha256, p.sha256, p_kind, coalesce(p_pixel_preserving, false) and p_kind in ('identical', 'same_content', 'scale', 'frame_of', 'sheet_of'),
          left(coalesce(p_summary, ''), 1000), coalesce(p_details, '{}'::jsonb), left(coalesce(p_checker, 'unknown'), 200))
  returning * into pr;
  if pr.pixel_preserving and a.status = 'held' and p.status in ('approved', 'ready') then
    insert into public.studio_approvals (asset_id, sha256, verdict, note, by_agent, by_app, method, proof_id)
    values (a.id, a.sha256, 'approved', pr.summary, 'proof', 'sprite-drop', 'proof', pr.id);
    update public.studio_assets set status = 'approved' where id = a.id;
    approved := true;
  else
    why := case when not pr.pixel_preserving then 'not pixel-preserving, so Kody approves it'
                when a.status <> 'held' then 'already ' || a.status
                else 'its parent is ' || p.status || ', not approved' end;
  end if;
  return jsonb_build_object('proof_id', pr.id, 'kind', pr.kind, 'pixel_preserving', pr.pixel_preserving, 'summary', pr.summary,
    'auto_approved', approved, 'status', (select status from public.studio_assets where id = a.id), 'why_not', why);
end $$;

-- ---------- lineage: a picture back to its original, with every decision ----------
create or replace function public.studio_asset_lineage(p_asset_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare cur uuid := p_asset_id; out jsonb := '[]'::jsonb; a public.studio_assets; n int := 0;
begin
  while cur is not null and n < 12 loop
    select * into a from public.studio_assets where id = cur and user_id = auth.uid();
    if not found then exit; end if;
    out := out || jsonb_build_array(jsonb_build_object(
      'id', a.id, 'name', a.original_name, 'sha256', a.sha256, 'status', a.status, 'made_by', a.made_by, 'size', a.width || 'x' || a.height,
      'frames', a.anim, 'created_at', a.created_at,
      'decision', (select jsonb_build_object('verdict', v.verdict, 'method', v.method, 'at', v.at, 'by_kody', v.user_id is not null,
                     'device', v.device, 'note', v.note, 'proof', (select jsonb_build_object('kind', pr.kind, 'summary', pr.summary) from public.studio_proofs pr where pr.id = v.proof_id))
                   from public.studio_approvals v where v.asset_id = a.id and v.sha256 = a.sha256 order by v.id desc limit 1)));
    cur := a.parent_id; n := n + 1;
  end loop;
  return out;
end $$;

revoke all on function public.studio_record_proof(uuid, text, text, text, boolean, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.studio_record_proof(uuid, text, text, text, boolean, text, jsonb, text) to service_role;
revoke all on function public.studio_asset_lineage(uuid), public.studio_parent_ok(uuid) from public, anon;
grant execute on function public.studio_asset_lineage(uuid), public.studio_parent_ok(uuid) to authenticated;
revoke all on function public.studio_approvals_parent_first(), public.studio_proofs_permanent() from public, anon, authenticated;
grant select on public.studio_proofs to authenticated;

create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1, 'approvals', 2, 'proofs', 1,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;

commit;
