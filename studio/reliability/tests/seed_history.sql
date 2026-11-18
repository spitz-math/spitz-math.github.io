-- Old-style history (run BEFORE the migration): tasks, messages and events using kody/chatgpt.
do $$
declare tid uuid; r jsonb;
begin
  perform t.as_app('dashboard');
  r := public.studio_create_task('seed-task-open-kody', 'arcade', 'Kody task', 'b', 'kody', '[]'); tid := (r -> 'task' ->> 'id')::uuid;
  r := public.studio_post_message(tid, 'kody-seed-3', 'note', 'from kody', '[]', null, null, null);
  perform t.as_app('chatgpt');
  r := public.studio_create_task('seed-task-open-chatgpt', 'arcade', 'Chat task', 'b', 'claude', '[]'); tid := (r -> 'task' ->> 'id')::uuid;
  r := public.studio_post_message(tid, 'chatgpt-seed-2', 'note', 'from chat', '[]', null, 'chatgpt', t.ver(tid));
  r := public.studio_worker_post(tid, 'worker-seed-1', 'report', 'from worker', '[]', null, 'kody', t.ver(tid));
  perform t.as_app('dashboard');
  r := public.studio_post_message(tid, 'kody-seed-4', 'note', 'back to chatgpt', '[]', null, 'chatgpt', t.ver(tid));
  perform public.studio_note_read(tid);
  perform t.as_app('chatgpt'); perform public.studio_note_read(tid);
end $$;
create table t.before (k text primary key, v text);
insert into t.before select 'messages', string_agg(body || '#' || seq || '#' || created_at, ',' order by id) from public.studio_messages;
insert into t.before select 'message_count', count(*)::text from public.studio_messages;
insert into t.before select 'tasks', string_agg(id || '#' || version || '#' || user_id, ',' order by id) from public.studio_tasks;
insert into t.before select 'old_values', ((select count(*) from public.studio_tasks where turn in ('kody','chatgpt')) + (select count(*) from public.studio_tasks where created_by in ('kody','chatgpt'))
  + (select count(*) from public.studio_messages where author in ('kody','chatgpt')) + (select count(*) from public.studio_messages where set_turn in ('kody','chatgpt'))
  + (select count(*) from public.studio_run_events where actor in ('kody','chatgpt')))::text;
insert into t.before select 'worker_wakes', t.worker_wakes()::text;
insert into t.before select 'claude_wakes', t.claude_wakes()::text;
insert into t.before values ('http', '0');
-- a live push subscription so the phone trigger would really send
insert into public.studio_push_subs values ('https://push.example/1', '00000000-0000-0000-0000-00000000000a', '{}');
update t.before set v = (select count(*) from net.http_request_queue)::text where k = 'http';
-- the migration's "no live run" guard needs finished runs only
