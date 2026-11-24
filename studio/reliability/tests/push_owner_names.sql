-- Tests for 20261121000000_push_names_owner.sql. Each statement is its own transaction, so the commit-time alert has fired
-- before the checks read the push queue.
create function t.pushes(tag text) returns text language sql as $$
  select coalesce(string_agg(body ->> 'title', ' | ' order by id), '') from net.http_request_queue
   where url like '%/push-notify' and body ->> 'tag' = tag $$;
create function t.pushbody(tag text) returns text language sql as $$
  select body ->> 'body' from net.http_request_queue where url like '%/push-notify' and body ->> 'tag' = tag order by id desc limit 1 $$;
create function t.tid(k text) returns text language sql as $$ select id::text from public.studio_tasks where request_key = k $$;
insert into public.studio_push_subs (endpoint, user_id, sub) values ('https://push.example/1', '00000000-0000-0000-0000-00000000000a', '{}');
select t.as_app('claude');
-- one task per owner, the way every flow creates them (studio_create_task: insert with no turn, then set it)
select public.studio_create_task('claude-push-chat', 'rook-and-ruin', 'Blacksmith props', 'b', 'chatgpt_chat', '[]', 'claude_thread', 'new', null, '[]');
select public.studio_create_task('claude-push-worker', 'rook-and-ruin', 'Imp redo', 'b', 'openai_worker', '[]', 'claude_thread', 'new', null, '[]');
select public.studio_create_task('claude-push-claude', 'rook-and-ruin', 'Wire the kiln', 'b', 'claude', '[]', 'claude_thread', 'text', null, '[]');
select public.studio_create_task('claude-push-thread', 'rook-and-ruin', 'Lancer art', 'b', 'claude_thread', '[]', 'claude_thread', 'text', null, '[]');
select public.studio_create_task('claude-push-spitz', 'rook-and-ruin', 'Pick a room', 'b', 'spitz', '[]', 'claude_thread', 'text', null, '[]');
select public.studio_create_task('claude-push-none', 'rook-and-ruin', 'Orphan task', 'b', null, '[]', 'claude_thread', 'text', null, '[]');
do $$ begin
  perform t.check(t.pushes(t.tid('claude-push-chat')) = 'New task for your ChatGPT chat', 'new task names your ChatGPT chat, one alert only', t.pushes(t.tid('claude-push-chat')));
  perform t.check(t.pushes(t.tid('claude-push-worker')) = 'New task for the ChatGPT worker', 'new task names the ChatGPT worker', t.pushes(t.tid('claude-push-worker')));
  perform t.check(t.pushes(t.tid('claude-push-claude')) = 'New task for the Claude worker', 'new task names the Claude worker', t.pushes(t.tid('claude-push-claude')));
  perform t.check(t.pushes(t.tid('claude-push-thread')) = 'New task for a Claude thread', 'new task names a Claude thread', t.pushes(t.tid('claude-push-thread')));
  perform t.check(t.pushes(t.tid('claude-push-spitz')) = 'New task for you', 'new task for Kody says you', t.pushes(t.tid('claude-push-spitz')));
  perform t.check(t.pushes(t.tid('claude-push-none')) = 'New task with no owner', 'a truly ownerless task is flagged', t.pushes(t.tid('claude-push-none')));
  perform t.check(t.pushbody(t.tid('claude-push-none')) like 'Orphan task. Nobody will start it%', 'the flag says nobody will start it', t.pushbody(t.tid('claude-push-none')));
  perform t.check(not exists (select 1 from net.http_request_queue where body ->> 'title' ilike '%nobody%' or body ->> 'title' ilike '%someone%'),
                  'no alert title says nobody or someone', null);
end $$;
-- later hand-offs still alert, with proper names
select public.studio_post_message(t.tid('claude-push-none')::uuid, 'claude-push-h1', 'note', 'x', '[]', null, 'claude', t.ver(t.tid('claude-push-none')::uuid), 'claude_thread');
select public.studio_post_message(t.tid('claude-push-worker')::uuid, 'claude-push-h2', 'note', 'x', '[]', null, 'spitz', t.ver(t.tid('claude-push-worker')::uuid), 'claude_thread');
select public.studio_post_message(t.tid('claude-push-claude')::uuid, 'claude-push-h3', 'note', 'x', '[]', null, 'claude_thread', t.ver(t.tid('claude-push-claude')::uuid), 'claude_thread');
select public.studio_post_message(t.tid('claude-push-thread')::uuid, 'claude-push-h4', 'note', 'x', '[]', 'done', null, t.ver(t.tid('claude-push-thread')::uuid), 'claude_thread');
do $$ begin
  perform t.check(t.pushes(t.tid('claude-push-none')) = 'New task with no owner | Handed to the Claude worker', 'an ownerless task handed on later alerts with the new owner', t.pushes(t.tid('claude-push-none')));
  perform t.check(t.pushes(t.tid('claude-push-worker')) = 'New task for the ChatGPT worker | The ChatGPT worker handed it to you', 'hand-off to Kody keeps capitals', t.pushes(t.tid('claude-push-worker')));
  perform t.check(t.pushes(t.tid('claude-push-claude')) = 'New task for the Claude worker | The Claude worker → a Claude thread', 'hand-off between Claudes names both', t.pushes(t.tid('claude-push-claude')));
  perform t.check(t.pushes(t.tid('claude-push-thread')) = 'New task for a Claude thread | Done ✓', 'done still alerts', t.pushes(t.tid('claude-push-thread')));
end $$;
-- no phone saved: nothing is sent
delete from public.studio_push_subs;
select public.studio_create_task('claude-push-nophone', 'rook-and-ruin', 'Quiet', 'b', 'chatgpt_chat', '[]', 'claude_thread', 'text', null, '[]');
do $$ begin
  perform t.check(t.pushes(t.tid('claude-push-nophone')) = '', 'no saved phone, no alert', null);
end $$;
