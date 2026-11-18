-- Tests for 20261118010000_typed_tasks_refs_status.sql (on top of the identity migration).
create function t.asset(name text) returns uuid language sql as $$
  insert into public.studio_assets (user_id, task_id, file_name, sha256) values ('00000000-0000-0000-0000-00000000000a', 'refs', name, encode(digest(name, 'sha256'), 'hex')) returning id $$;
create function t.err(sql text) returns text language plpgsql as $$ begin execute sql; return 'none'; exception when others then return sqlerrm; end $$;
do $$
declare tid uuid; r jsonb; guard uuid := t.asset('guard_room.png'); rack uuid := t.asset('lance_rack.png'); stand uuid := t.asset('armor_stand.png');
        w0 bigint; c0 bigint; e text; out uuid; ver int; spec jsonb := '{"kind":"room","size":[480,270],"alpha":"opaque"}';
begin
  perform t.as_app('claude');
  -- creating a composite straight onto a worker, with no refs, is refused and leaves nothing behind
  w0 := t.claude_wakes();
  e := t.err($q$ select public.studio_create_task('claude-p2-0001', 'rook-and-ruin', 'Barracks', 'b', 'claude', '[]', 'claude_thread', 'composite', null, '[]') $q$);
  perform t.check(e like 'Not ready to hand on%', 'lifecycle: composite with no refs cannot be handed to a worker', left(e, 80));
  perform t.check(t.claude_wakes() = w0 and not exists (select 1 from public.studio_tasks where request_key = 'claude-p2-0001'),
                  'lifecycle: the refused create leaves no task and sends no wake', null);

  -- the normal path: create with the thread, attach refs later, then hand on
  r := public.studio_create_task('claude-p2-0002', 'rook-and-ruin', 'Barracks', 'b', 'claude_thread', '[]', 'claude_thread', 'composite', spec, '[]');
  tid := (r -> 'task' ->> 'id')::uuid;
  perform t.check((r -> 'readiness' ->> 'ready') = 'false', 'lifecycle: a composite without refs is created on claude_thread and reported incomplete',
                  r -> 'readiness' ->> 'missing');
  r := public.studio_attach_ref(tid, guard, 'source', true, 'claude_thread');
  perform t.check((r ->> 'ready') = 'false', 'lifecycle: composite with only the base is still incomplete', r ->> 'missing');
  r := public.studio_attach_ref(tid, rack, 'other', true, 'claude_thread');
  r := public.studio_attach_ref(tid, stand, 'other', true, 'claude_thread');
  perform t.check((r ->> 'ready') = 'true', 'lifecycle: base + 2 props + spec = ready', null);
  perform t.check((select string_agg(sha256, ',' order by added_at) from public.studio_task_refs where task_id = tid)
                  = (select string_agg(a.sha256, ',' order by x.added_at) from public.studio_task_refs x join public.studio_assets a on a.id = x.asset_id where x.task_id = tid),
                  'lifecycle: checksums recorded at attach time', null);

  -- capability routing
  e := t.err(format($q$ select public.studio_post_message(%L, 'claude-p2-0003', 'note', 'x', '[]', null, 'openai_worker', %s, 'claude_thread') $q$, tid, t.ver(tid)));
  perform t.check(e like 'The OpenAI API worker cannot take this task%', 'routing: a composite can never go to the API worker', left(e, 60));

  -- checksum change makes it not ready
  update public.studio_task_refs set sha256 = repeat('0', 64) where task_id = tid and asset_id = rack;
  e := t.err(format($q$ select public.studio_post_message(%L, 'claude-p2-0004', 'note', 'x', '[]', null, 'chatgpt_chat', %s, 'claude_thread') $q$, tid, t.ver(tid)));
  perform t.check(e like '%changed since it was attached%', 'lifecycle: a reference whose checksum changed blocks the handoff', left(e, 90));
  r := public.studio_attach_ref(tid, rack, 'other', true, 'claude_thread');

  -- hand to Kody's chat: allowed now, wakes nobody
  w0 := t.worker_wakes(); c0 := t.claude_wakes();
  r := public.studio_post_message(tid, 'claude-p2-0005', 'note', 'over to chat', '[]', null, 'chatgpt_chat', t.ver(tid), 'claude_thread');
  perform t.check((r -> 'task' ->> 'turn') = 'chatgpt_chat' and t.worker_wakes() = w0 and t.claude_wakes() = c0, 'lifecycle: ready task handed to chatgpt_chat, nothing auto-runs', null);
  e := t.err(format($q$ select public.studio_attach_ref(%L, %L, 'other', true, 'claude_thread') $q$, tid, guard));
  perform t.check(e like 'References can only change while%', 'lifecycle: refs are frozen while a worker or the chat has the task', left(e, 60));

  -- delivery gate: chat must fetch all 3 refs first
  perform t.as_app('chatgpt');
  e := t.err(format($q$ insert into public.studio_assets (user_id, task_id, file_name, sha256) values ('00000000-0000-0000-0000-00000000000a', %L, 'out.png', repeat('a', 64)) $q$, tid::text));
  perform t.check(e like 'Fetch every required reference%', 'gate: delivery refused before any reference was fetched', left(e, 60));
  perform public.studio_log_fetch(guard, tid); perform public.studio_log_fetch(rack, tid);
  e := t.err(format($q$ insert into public.studio_assets (user_id, task_id, file_name, sha256) values ('00000000-0000-0000-0000-00000000000a', %L, 'out.png', repeat('a', 64)) $q$, tid::text));
  perform t.check(e like '%' || stand::text || '%', 'gate: refusal names the one reference still missing', left(e, 60));
  perform t.as_app('claude'); perform public.studio_log_fetch(stand, tid, 'claude');
  perform t.as_app('chatgpt');
  e := t.err(format($q$ insert into public.studio_assets (user_id, task_id, file_name, sha256) values ('00000000-0000-0000-0000-00000000000a', %L, 'out.png', repeat('a', 64)) $q$, tid::text));
  perform t.check(e like 'Fetch every required reference%', 'gate: a fetch by a DIFFERENT app (Claude) does not count for the chat', left(e, 60));
  perform public.studio_log_fetch(stand, tid);
  insert into public.studio_assets (user_id, task_id, file_name, sha256, status) values ('00000000-0000-0000-0000-00000000000a', tid::text, 'out.png', repeat('a', 64), 'ready') returning id into out;
  perform t.check((select status from public.studio_assets where id = out) = 'draft', 'gate: delivery allowed after all fetches; it always starts as draft (even if "ready" was sent)', null);
  perform t.check((select evidence ->> 'refs_supplied_to_image_model' from public.studio_assets where id = out) like 'not verified%',
                  'evidence: fetch is recorded, supplying refs to the model is marked NOT verified', null);
  perform t.check(jsonb_array_length((select evidence -> 'required_refs_fetched_before_delivery' from public.studio_assets where id = out)) = 3, 'evidence: all 3 fetches listed', null);

  -- API worker (service role, no user) can never deliver on a task with required refs
  perform t.as_app('none');
  e := t.err(format($q$ insert into public.studio_assets (user_id, task_id, file_name, sha256) values ('00000000-0000-0000-0000-00000000000a', %L, 'w.png', repeat('b', 64)) $q$, tid::text));
  perform t.check(e like '%API worker cannot use references yet%', 'gate: the API worker cannot deliver on a task with required refs', left(e, 60));

  -- ready needs PASS for this exact sha + spitz approval
  perform t.as_app('claude');
  e := t.err(format($q$ select public.studio_mark_ready(%L) $q$, out));
  perform t.check(e like 'Not ready: needs the newest validation%', 'ready: refused with no validation and no approval', left(e, 70));
  e := t.err(format($q$ select public.studio_record_validation(%L, %L, 'PASS', '{}', '{}', 'art_check 1', 'claude_thread') $q$, out, repeat('c', 64)));
  perform t.check(e like 'This validation is for a different file%', 'validation: a result for a different file is refused', left(e, 50));
  r := public.studio_record_validation(out, repeat('a', 64), 'INDETERMINATE', spec, '{}', 'art_check 1', 'claude_thread');
  perform t.check((select status from public.studio_assets where id = out) = 'failed', 'validation: a non-PASS result marks the asset failed', null);
  r := public.studio_record_validation(out, repeat('a', 64), 'PASS', spec, '{}', 'art_check 1', 'claude_thread');
  e := t.err(format($q$ select public.studio_review_asset(%L, 'approved', 'approve', %L, 'claude') $q$, out, repeat('a', 64)));
  perform t.check(e like 'Only a Claude project thread%', 'approval: the Claude worker cannot record approval', left(e, 40));
  e := t.err(format($q$ select public.studio_review_asset(%L, 'approved', '', %L, 'claude_thread') $q$, out, repeat('a', 64)));
  perform t.check(e like 'Quote Kody%', 'approval: needs Kody''s own words', left(e, 40));
  e := t.err(format($q$ select public.studio_review_asset(%L, 'approved', 'approve', %L, 'claude_thread') $q$, out, repeat('c', 64)));
  perform t.check(e like 'Kody saw a different file%', 'approval: refused when the file Kody saw is not the stored one', left(e, 40));
  e := t.err(format($q$ select public.studio_mark_ready(%L) $q$, out));
  perform t.check(e like '%(now: PASS)%(now: missing)%', 'ready: PASS alone is not enough', left(e, 120));
  perform t.as_app('dashboard');
  e := t.err(format($q$ select public.studio_review_asset(%L, 'approved', 'approve', %L) $q$, out, repeat('a', 64)));
  perform t.check(e like 'Kody approves art in the Claude thread%', 'approval: not from the dashboard', left(e, 40));
  perform t.as_app('chatgpt');
  e := t.err(format($q$ select public.studio_review_asset(%L, 'approved', 'approve', %L) $q$, out, repeat('a', 64)));
  perform t.check(e like 'Kody approves art in the Claude thread%', 'approval: not from ChatGPT', left(e, 40));
  perform t.as_app('claude');
  r := public.studio_review_asset(out, 'approved', 'Kody: "approve, looks right in game"', repeat('a', 64), 'claude_thread');
  perform t.check((select by_app from public.studio_approvals where asset_id = out order by id desc limit 1) = 'claude_thread', 'approval: recorded as spitz via the Claude thread', null);
  r := public.studio_mark_ready(out);
  perform t.check((select status from public.studio_assets where id = out) = 'ready', 'ready: PASS + spitz approval of the same file = ready', null);
  e := t.err(format($q$ update public.studio_assets set sha256 = repeat('d', 64) where id = %L $q$, out));
  perform t.check(e like 'An asset''s bytes never change%', 'ready: a ready asset''s checksum cannot be swapped', left(e, 40));

  -- a later failing validation of the same file blocks a fresh "ready"
  perform t.as_app('claude');
  r := public.studio_record_validation(out, repeat('a', 64), 'FAIL', spec, '{}', 'art_check 2', 'claude_thread');
  update public.studio_assets set status = 'approved' where id = out;
  e := t.err(format($q$ select public.studio_mark_ready(%L) $q$, out));
  perform t.check(e like '%(now: FAIL)%', 'ready: the NEWEST validation counts', left(e, 90));

  -- old tasks with no job type and no refs behave as before
  perform t.as_app('dashboard');
  r := public.studio_create_task('kody-p2-0009', 'arcade', 'plain', 'b', 'openai_worker', '[]');
  perform t.check((r -> 'task' ->> 'turn') = 'openai_worker' and (r -> 'readiness' ->> 'ready') = 'true', 'compat: an untyped task with no refs still goes straight to the worker', null);
  insert into public.studio_assets (user_id, task_id, file_name, sha256) values ('00000000-0000-0000-0000-00000000000a', (r -> 'task' ->> 'id'), 'free.png', repeat('e', 64));
  perform t.check(true, 'compat: delivery on a task without required refs is not gated', null);

  -- create_task with required_refs in one call (atomic)
  perform t.as_app('claude');
  r := public.studio_create_task('claude-p2-0010', 'rook-and-ruin', 'Lancer resize', 'b', 'chatgpt_chat', '[]', 'claude_thread', 'refine',
         '{"kind":"sheet","size":[192,177]}', jsonb_build_array(jsonb_build_object('asset_id', guard, 'role', 'source')));
  perform t.check((r -> 'task' ->> 'turn') = 'chatgpt_chat', 'lifecycle: create + attach + hand on in one call when complete', null);
end $$;
