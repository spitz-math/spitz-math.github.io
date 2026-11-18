-- Tests for 20261118020000_locked_approvals.sql (on top of identities + typed tasks, with pictures made before the rule).
create function t.who(name text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case name
    when 'kody'      then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","session_id":"00000000-0000-0000-0000-0000000005a1"}'
    when 'kody_old'  then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","session_id":"00000000-0000-0000-0000-0000000005e0"}'
    when 'kody_nosession' then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}'
    when 'claude'    then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","client_id":"00000000-0000-0000-0000-0000000000c1","session_id":"00000000-0000-0000-0000-0000000005c1"}'
    when 'chatgpt'   then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","client_id":"00000000-0000-0000-0000-0000000000c2","session_id":"00000000-0000-0000-0000-0000000005c2"}'
    -- an AI token with the client_id stripped off still points at its OAuth session
    when 'forged'    then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","session_id":"00000000-0000-0000-0000-0000000005c2"}'
    when 'anon_kody' then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","is_anonymous":true,"session_id":"00000000-0000-0000-0000-0000000005a1"}'
    when 'worker'    then '{"role":"service_role"}'
    else '' end, false);
end $$;
create function t.err(sql text) returns text language plpgsql as $$ begin execute sql; return 'none'; exception when others then return sqlerrm; end $$;
create function t.drop(name text, task text, parent uuid default null) returns uuid language sql as $$
  insert into public.studio_assets (user_id, task_id, file_name, original_name, sha256, parent_id)
  values ('00000000-0000-0000-0000-00000000000a', task, name, name, encode(digest(name || clock_timestamp()::text, 'sha256'), 'hex'), parent) returning id $$;
create function t.sha(id uuid) returns text language sql as $$ select sha256 from public.studio_assets where studio_assets.id = $1 $$;
create function t.st(id uuid) returns text language sql as $$ select status from public.studio_assets where studio_assets.id = $1 $$;

do $$
declare tid uuid; tid2 uuid; g uuid; c uuid; w uuid; x uuid; y uuid; e text; r jsonb; n0 bigint; ap record; legacy uuid := '00000000-0000-0000-0000-00000000aa01';
        ready_old uuid := '00000000-0000-0000-0000-00000000aa02'; who text;
begin
  -- a task waiting on Kody, made by the Claude thread
  perform t.who('claude');
  r := public.studio_create_task('m1-0001', 'rook-and-ruin', 'Forge for the Kiln', 'b', 'spitz', '[]', 'claude_thread', 'new', null, '[]');
  tid := (r -> 'task' ->> 'id')::uuid;

  -- 1. new pictures are held, whoever makes them
  perform t.who('chatgpt'); g := t.drop('forge_gpt.png', tid::text);
  perform t.who('claude');  c := t.drop('forge_claude.png', tid::text);
  perform t.who('worker');  w := t.drop('forge_worker.png', 'loose');
  perform t.check(t.st(g) = 'held' and t.st(c) = 'held' and t.st(w) = 'held', 'held: every new picture starts held (ChatGPT, Claude, worker)', t.st(g) || t.st(c) || t.st(w));
  perform t.check((select made_by from public.studio_assets where id = g) = 'chatgpt_chat' and (select made_by from public.studio_assets where id = c) = 'claude'
                  and (select made_by from public.studio_assets where id = w) = 'openai_worker', 'held: who made each picture is recorded', null);
  perform t.check(t.st(legacy) = 'draft' and t.st(ready_old) = 'ready', 'legacy: pictures made before the rule keep their status', null);

  -- 2. nobody but Kody's own sign-in can approve
  foreach who in array array['chatgpt', 'claude', 'worker', 'forged', 'kody_nosession', 'kody_old', 'anon_kody', 'none'] loop
    perform t.who(who);
    e := t.err(format($q$ select public.studio_approve(%L, %L, 'approved') $q$, g, t.sha(g)));
    perform t.check(e <> 'none' and t.st(g) = 'held', 'approve refused: ' || who, left(e, 90));
  end loop;
  -- not even by writing the table or the status directly (superuser, with an AI token or none)
  foreach who in array array['chatgpt', 'claude', 'worker', 'none'] loop
    perform t.who(who);
    e := t.err(format($q$ insert into public.studio_approvals (asset_id, sha256, verdict, by_agent, by_app, user_id, session_id, method)
                          values (%L, %L, 'approved', 'spitz', 'spitz.dev', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000005a1', 'spitz_dev_page') $q$, g, t.sha(g)));
    perform t.check(e <> 'none', 'direct approval insert refused: ' || who, left(e, 90));
    e := t.err(format($q$ update public.studio_assets set status = 'approved' where id = %L $q$, g));
    perform t.check(e <> 'none' and t.st(g) = 'held', 'direct status change to approved refused: ' || who, left(e, 90));
  end loop;
  perform t.who('claude');
  e := t.err(format($q$ select public.studio_review_asset(%L, 'approved', 'approve', %L, 'claude_thread') $q$, g, t.sha(g)));
  perform t.check(e like 'Approvals now happen only on spitz.dev%', 'the Claude thread can no longer record approvals', left(e, 70));

  -- 3. held pictures cannot be used
  perform t.who('claude');
  r := public.studio_create_task('m1-0002', 'rook-and-ruin', 'Forge animation', 'b', 'claude_thread', '[]', 'claude_thread', 'refine', '{"kind":"prop","size":[48,44]}', '[]');
  tid2 := (r -> 'task' ->> 'id')::uuid;
  e := t.err(format($q$ select public.studio_attach_ref(%L, %L, 'source', true, 'claude_thread') $q$, tid2, g));
  perform t.check(e like '%waiting for Kody''s approval%', 'held: cannot be attached as a reference', left(e, 70));
  e := t.err(format($q$ select public.studio_post_message(%L, 'm1-0003', 'report', 'here it is', %L, null, null, null, 'claude_thread') $q$, tid, jsonb_build_array(jsonb_build_object('type', 'asset', 'id', g))));
  perform t.check(e like '%waiting for Kody''s approval%', 'held: cannot be cited in a task message', left(e, 70));
  perform t.who('chatgpt');
  e := t.err(format($q$ select public.studio_post_message(%L, 'm1-0004', 'report', 'done', %L) $q$, tid, jsonb_build_array(jsonb_build_object('type', 'asset', 'id', c))));
  perform t.check(e like '%waiting for Kody''s approval%', 'held: ChatGPT cannot cite one either', left(e, 70));
  perform t.who('claude');
  e := t.err(format($q$ select public.studio_log_fetch(%L, %L, 'claude') $q$, g, tid));
  perform t.check(e like '%waiting for Kody''s approval%', 'held: cannot be fetched for a task', left(e, 70));
  insert into public.studio_validations (asset_id, sha256, result, record, validator, by_agent, by_app) values (g, t.sha(g), 'PASS', '{}', 'art_check@test', 'claude', 'claude.ai');
  e := t.err(format($q$ select public.studio_mark_ready(%L) $q$, g));
  perform t.check(e like '%waiting for Kody''s approval%' and t.st(g) = 'held', 'held: cannot be marked ready, even with a PASS', left(e, 70));
  e := t.err(format($q$ select t.drop('forge_anim.png', %L, %L) $q$, tid::text, g));
  perform t.check(e like 'made_from:%held%', 'held: nothing can be made from a held picture', left(e, 70));

  -- 4. Kody approves from his own sign-in, on the exact file
  perform t.who('kody');
  e := t.err(format($q$ select public.studio_approve(%L, %L, 'approved') $q$, g, repeat('0', 64)));
  perform t.check(e like 'The page showed a different file%' and t.st(g) = 'held', 'approve: a checksum that is not the stored file is refused', left(e, 60));
  n0 := t.claude_wakes();
  r := public.studio_approve(g, t.sha(g), 'approved', null, 'spitz_dev_page', 'iPhone Safari');
  select * into ap from public.studio_approvals where asset_id = g order by id desc limit 1;
  perform t.check(t.st(g) = 'approved' and ap.verdict = 'approved', 'approve: Kody''s own session approves', r ->> 'next');
  perform t.check(ap.sha256 = t.sha(g) and ap.user_id = '00000000-0000-0000-0000-00000000000a' and ap.session_id = '00000000-0000-0000-0000-0000000005a1'
                  and ap.method = 'spitz_dev_page' and ap.device = 'iPhone Safari' and ap.at is not null,
                  'approve: record has asset, full sha256, user, session, time, method, device', null);
  perform t.check((select count(*) from public.studio_messages where task_id = tid and kind = 'decision') = 1, 'approve: the task gets a note', null);
  perform t.check((select turn from public.studio_tasks where id = tid) = 'spitz' and t.claude_wakes() = n0,
                  'approve: no handoff while another picture on the task is still held', null);
  -- approved pictures are usable
  perform t.who('claude');
  perform public.studio_log_fetch(g, tid, 'claude');
  r := public.studio_attach_ref(tid2, g, 'source', true, 'claude_thread');
  perform t.check(true, 'approved: can be fetched and attached as a reference', null);
  perform public.studio_mark_ready(g);
  perform t.check(t.st(g) = 'ready', 'approved + PASS: can be marked ready', null);
  e := t.err(format($q$ update public.studio_assets set sha256 = %L where id = %L $q$, repeat('1', 64), g));
  perform t.check(e like '%never change%', 'approved: bytes can never change', left(e, 60));

  -- 5. approvals are permanent
  foreach who in array array['kody', 'none'] loop
    perform t.who(who);
    e := t.err(format($q$ update public.studio_approvals set verdict = 'rejected' where asset_id = %L $q$, g));
    perform t.check(e like 'Approvals are permanent%', 'approvals cannot be edited: ' || who, left(e, 50));
    e := t.err(format($q$ delete from public.studio_approvals where asset_id = %L $q$, g));
    perform t.check(e like 'Approvals are permanent%', 'approvals cannot be deleted: ' || who, left(e, 50));
  end loop;

  -- 6. changes on a ChatGPT picture: rejected for good, note kept, task marked as needing Kody in ChatGPT
  perform t.who('chatgpt'); x := t.drop('forge_gpt_v2.png', tid::text);
  perform t.who('kody');
  e := t.err(format($q$ select public.studio_approve(%L, %L, 'changes', '') $q$, x, t.sha(x)));
  perform t.check(e = 'Say what to change.', 'changes: needs a note', e);
  r := public.studio_approve(c, t.sha(c), 'rejected', 'not this one');   -- the Claude one goes, so x is the last held picture
  r := public.studio_approve(x, t.sha(x), 'changes', 'Keep the tall flames from the original');
  perform t.check(t.st(x) = 'rejected' and t.st(c) = 'rejected', 'changes / reject: the file becomes rejected', null);
  perform t.check((r ->> 'needs_you_in_chatgpt')::boolean and r ->> 'next' like '%will NOT start by itself%', 'changes on a ChatGPT picture: says plainly that Kody must open ChatGPT', r ->> 'next');
  perform t.check((select turn from public.studio_tasks where id = tid) = 'chatgpt_chat'
                  and exists (select 1 from public.studio_messages where task_id = tid and body like '%Keep the tall flames from the original%'),
                  'changes: Kody''s note is on the task and the turn is his ChatGPT chat', null);
  e := t.err(format($q$ select public.studio_approve(%L, %L, 'approved') $q$, x, t.sha(x)));
  perform t.check(e like '%stays rejected%', 'rejected: can never be approved later', left(e, 60));
  perform t.who('claude');
  e := t.err(format($q$ select public.studio_log_fetch(%L, %L, 'claude') $q$, x, tid));
  perform t.check(e like '%rejected by Kody%', 'rejected: can never be fetched for a task', left(e, 60));

  -- 7. approving the last held picture on a task waiting for Kody hands it to the Claude worker
  update public.studio_tasks set turn = 'spitz' where id = tid;
  perform t.who('chatgpt'); y := t.drop('forge_gpt_v3.png', tid::text);
  perform t.who('kody'); n0 := t.claude_wakes();
  r := public.studio_approve(y, t.sha(y), 'approved');
  perform t.check((select turn from public.studio_tasks where id = tid) = 'claude' and r ->> 'handed_to' = 'claude', 'approve: last held picture approved, the Claude worker takes the task', r ->> 'next');

  -- 8. legacy pictures still work exactly as before
  perform t.who('claude');
  r := public.studio_attach_ref(tid2, legacy, 'style', true, 'claude_thread');
  perform public.studio_log_fetch(legacy, tid2, 'claude');
  perform t.check(t.st(ready_old) = 'ready', 'legacy: draft pictures can still be attached and fetched; ready stays ready', null);
end $$;
