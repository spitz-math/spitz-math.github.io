-- spitz.dev M4 regression drill: the six refusal cases from Revision 2, run against the LIVE database.
-- Everything runs in one transaction that ends by raising an exception carrying the results, so nothing is ever
-- kept (no asset, approval, task or message survives). Paste into the SQL Editor or run with execute_sql.
-- Real identities: Kody's iPhone session, the ChatGPT and Claude OAuth sessions (with their client_id), and the
-- server key (role service_role, what the OpenAI worker and every edge function use). Case 6 (unlisted game art) is
-- run with tools/art_check/art_list.py, not here.
create function pg_temp.act(who text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case who
    when 'kody'    then '{"sub":"3002269d-6a97-47d4-9579-f0740807dfcf","role":"authenticated","session_id":"a2d99fa2-4a17-4296-b95d-a583a3a41922"}'
    when 'chatgpt' then '{"sub":"3002269d-6a97-47d4-9579-f0740807dfcf","role":"authenticated","session_id":"9b7c6533-46c3-4f7b-a11f-a163addfd5cd","client_id":"b6a213b4-8532-4ec3-bdcc-1b64a680008c"}'
    when 'claude'  then '{"sub":"3002269d-6a97-47d4-9579-f0740807dfcf","role":"authenticated","session_id":"d293b52f-3c8d-4dfa-900b-41c70bed8643","client_id":"56f5fde5-8b38-48d9-87fc-796ea018321e"}'
    when 'server'  then '{"role":"service_role"}' end, true);
  if who = 'server' then set local role service_role; else set local role authenticated; end if;
end $$;
-- run one statement as someone; returns 'ALLOWED' or the exact refusal
create function pg_temp.try(who text, q text) returns text language plpgsql as $$
begin perform pg_temp.act(who); execute q; reset role; return 'ALLOWED';
exception when others then reset role; return 'REFUSED: ' || sqlerrm; end $$;
create function pg_temp.new_asset(who text, task text, src uuid, name text, parent uuid) returns uuid language plpgsql as $$
declare id uuid;
begin
  perform pg_temp.act(who);
  insert into public.studio_assets (user_id, task_id, file_name, original_name, mime_type, size_bytes, width, height, sha256, path, source, parent_id)
  select user_id, task, name, name, mime_type, size_bytes, width, height, sha256, path || '#' || name, 'base64', parent from public.studio_assets where studio_assets.id = src
  returning studio_assets.id into id;
  reset role; return id;
end $$;

do $$
declare
  res text := ''; r text; ok boolean := true;
  pit_original uuid := '43150676-222d-4b91-9ac3-5f360299a88b';  -- fire_pit.png (stands in for your liked original)
  pit_r3 uuid := '598373ce-a143-4856-a295-fdfcfe0664a6';        -- fire_pit_large.png (the valid-but-different round 3 pit)
  pit_conv uuid := '232deb03-d229-404e-8c01-d92a41d8fd7d';      -- a different file standing in for the 1x conversion
  orig uuid; conv uuid; sub uuid; sub2 uuid; tid uuid; tid2 uuid; v int; j jsonb;
  procedure_line text;
begin
  -- helper: record one expectation
  -- (inline: res := res || line; ok := ok and passed)

  ------------------------------------------------------------------ setup: your original approved as the source
  orig := pg_temp.new_asset('kody', 'm4-drill', pit_original, 'DRILL_original_pit.png', null);
  perform pg_temp.act('kody');
  j := public.studio_approve(orig, (select sha256 from public.studio_assets where id = orig), 'approved', 'drill', 'spitz_dev_page', 'drill');
  reset role;
  res := res || format(E'setup  original approved by Kody''s session: %s\n', (select status from public.studio_assets where id = orig));
  conv := pg_temp.new_asset('claude', 'm4-drill', pit_conv, 'DRILL_1x_conversion.png', orig);
  res := res || format(E'setup  1x conversion made from it: %s (no proof, so held for Kody)\n', (select status from public.studio_assets where id = conv));
  perform pg_temp.act('kody');
  j := public.studio_create_task('m4-drill-key-1', 'm4-drill', 'DRILL Ember Kiln fire pit', 'drill', 'spitz', '[]'::jsonb, null, 'refine', '{"size":[64,44]}'::jsonb,
         jsonb_build_array(jsonb_build_object('asset_id', orig, 'role', 'source')));
  reset role; tid := (j -> 'task' ->> 'id')::uuid;

  ------------------------------------------------------------------ 1. Ember Kiln substitution
  r := pg_temp.try('chatgpt', format('select pg_temp.new_asset(''chatgpt'', %L, %L, ''DRILL_round3_pit_nofetch.png'', %L)', tid, pit_r3, orig));
  res := res || format(E'1-  round 3 pit delivered without fetching the approved source first: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('chatgpt', format('select public.studio_log_fetch(%L, %L)', orig, tid));
  res := res || format(E'1+  ChatGPT fetches the approved source for the task: %s\n', r); ok := ok and r = 'ALLOWED';
  perform pg_temp.act('chatgpt'); perform public.studio_log_fetch(orig, tid); reset role;
  sub := pg_temp.new_asset('chatgpt', tid::text, pit_r3, 'DRILL_round3_pit.png', orig);
  r := (select status from public.studio_assets where id = sub);
  res := res || format(E'1a  round 3 pit delivered against the task: %s\n', r); ok := ok and r = 'held';
  r := pg_temp.try('claude', format('select public.studio_attach_ref(%L, %L, ''source'', true, ''claude_thread'')', tid, sub));
  res := res || format(E'1b  Claude attaches it to the task: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format('select public.studio_mark_ready(%L)', sub));
  res := res || format(E'1c  Claude marks it ready: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format('select public.studio_log_fetch(%L, %L, ''claude_thread'')', sub, tid));
  res := res || format(E'1d  Claude fetches it for the task: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('chatgpt', format($q$ insert into public.studio_assets (user_id, task_id, file_name, original_name, sha256, path, source, parent_id)
         select user_id, 'm4-drill-2', 'DRILL_r3_as_conversion.png', 'x', sha256, path || '#r3conv', 'base64', %L from public.studio_assets where id = %L $q$, conv, pit_r3));
  res := res || format(E'1e  round 3 pit sent as if it were (made from) the held conversion: %s\n', r); ok := ok and r like 'REFUSED%';

  ------------------------------------------------------------------ 2. Unapproved derivative (the held 1x conversion)
  r := pg_temp.try('claude', format('select public.studio_attach_ref(%L, %L, ''style'', true, ''claude_thread'')', tid, conv));
  res := res || format(E'2a  attach the conversion to a task: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format('select public.studio_mark_ready(%L)', conv));
  res := res || format(E'2b  mark the conversion ready: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format($q$ select public.studio_post_message(%L, 'm4-drill-key-2', 'report', 'delivering', jsonb_build_array(jsonb_build_object('type','asset','id',%L::text)), null, null, null, 'claude_thread') $q$, tid, conv));
  res := res || format(E'2c  deliver it in a task message: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format('select public.studio_log_fetch(%L, %L, ''claude_thread'')', conv, tid));
  res := res || format(E'2d  fetch it for the task: %s\n', r); ok := ok and r like 'REFUSED%';

  ------------------------------------------------------------------ 3. Worker approval
  r := pg_temp.try('chatgpt', format('select public.studio_approve(%L, %L, ''approved'')', conv, (select sha256 from public.studio_assets where id = conv)));
  res := res || format(E'3a  ChatGPT approves: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format('select public.studio_approve(%L, %L, ''approved'')', conv, (select sha256 from public.studio_assets where id = conv)));
  res := res || format(E'3b  Claude (thread and worker share this sign-in) approves: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('server', format('select public.studio_approve(%L, %L, ''approved'')', conv, (select sha256 from public.studio_assets where id = conv)));
  res := res || format(E'3c  OpenAI worker (server key) calls studio_approve: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('server', format($q$ insert into public.studio_approvals (asset_id, sha256, verdict, by_agent, method) values (%L, %L, 'approved', 'spitz', 'spitz_dev_page') $q$, conv, (select sha256 from public.studio_assets where id = conv)));
  res := res || format(E'3d  OpenAI worker (server key) writes an approval row directly: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('server', format($q$ update public.studio_assets set status = 'approved' where id = %L $q$, conv));
  res := res || format(E'3e  OpenAI worker (server key) sets status approved: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('server', format($q$ insert into public.studio_proofs (asset_id, parent_id, asset_sha256, parent_sha256, kind, pixel_preserving, summary, checker) values (%L, %L, 'x', 'x', 'identical', true, 'fake', 'fake') $q$, conv, orig));
  res := res || format(E'3f  OpenAI worker (server key) writes a fake proof row: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format($q$ select public.studio_record_proof(%L, 'x', 'x', 'identical', true, 'fake', '{}'::jsonb, 'fake') $q$, conv));
  res := res || format(E'3g  Claude calls the proof recorder: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('chatgpt', format($q$ select public.studio_review_asset(%L, %L, 'approved', 'approve', 'claude_thread') $q$, conv, (select sha256 from public.studio_assets where id = conv)));
  res := res || format(E'3h  the retired review_asset path: %s\n', r); ok := ok and r like 'REFUSED%';

  ------------------------------------------------------------------ 4. Held-file access
  r := pg_temp.try('chatgpt', format('select public.studio_log_fetch(%L, %L)', sub, tid));
  res := res || format(E'4a  ChatGPT fetches a held file for a task: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('claude', format('select public.studio_log_fetch(%L, %L, ''claude'')', sub, tid));
  res := res || format(E'4b  Claude worker fetches a held file for a task: %s\n', r); ok := ok and r like 'REFUSED%';

  ------------------------------------------------------------------ 5. Missing source
  perform pg_temp.act('kody');
  j := public.studio_create_task('m4-drill-key-3', 'm4-drill', 'DRILL refine with no approved source', 'drill', 'spitz', '[]'::jsonb, null, 'refine', '{"size":[64,44]}'::jsonb, '[]'::jsonb);
  reset role; tid2 := (j -> 'task' ->> 'id')::uuid; v := (j -> 'task' ->> 'version')::int;
  r := pg_temp.try('kody', format($q$ select public.studio_post_message(%L, 'm4-drill-key-4', 'note', 'go', '[]'::jsonb, null, 'chatgpt_chat', %s, null) $q$, tid2, v));
  res := res || format(E'5a  hand a refine task with no source to ChatGPT: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('kody', format('select public.studio_attach_ref(%L, %L, ''source'')', tid2, conv));
  res := res || format(E'5b  attach a held picture as its source: %s\n', r); ok := ok and r like 'REFUSED%';
  r := pg_temp.try('kody', format($q$ select public.studio_create_task('m4-drill-key-5', 'm4-drill', 'x', 'x', 'claude', '[]'::jsonb, null, 'refine', '{"size":[1,1]}'::jsonb, '[]'::jsonb) $q$));
  res := res || format(E'5c  create a refine task straight onto the Claude worker: %s\n', r); ok := ok and r like 'REFUSED%';

  raise exception E'DRILL % (everything rolled back)\n%', case when ok then 'PASSED' else 'FAILED' end, res;
end $$;
