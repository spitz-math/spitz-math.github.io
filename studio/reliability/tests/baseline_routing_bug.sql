-- READ-ONLY reproduction of today's routing behaviour against the LIVE function snapshot.
-- Each check states what the live system does now. Kody wants these to be "bad" outcomes.
do $$
declare tid uuid; r jsonb; w0 bigint;
begin
  -- 1. Claude hands a task to "ChatGPT" meaning Kody's interactive chat: the API worker fires anyway.
  perform t.as_app('claude');
  r := public.studio_create_task('claude-test-0001', 'arcade', 'Barracks props', 'please make props', 'claude', '[]');
  tid := (r -> 'task' ->> 'id')::uuid;
  w0 := t.worker_wakes();
  r := public.studio_post_message(tid, 'claude-test-0002', 'note', 'Over to your ChatGPT chat', '[]', null, 'chatgpt', t.ver(tid));
  perform t.check(t.worker_wakes() = w0 + 1, 'BUG 1: handing to "chatgpt" (meant: Kody''s chat) fires the API worker',
                  format('%s worker wake(s)', t.worker_wakes() - w0));

  -- 2. Kody's interactive ChatGPT posts a note while it is its turn: the API worker fires AGAIN (duplicate run).
  perform t.as_app('chatgpt');
  w0 := t.worker_wakes();
  r := public.studio_post_message(tid, 'chat-test-0003', 'note', 'Fetched the refs, working on it', '[]', null, null, null);
  perform t.check(t.worker_wakes() = w0 + 1, 'BUG 2: any note on a ChatGPT-turn task re-fires the API worker (duplicate run)',
                  format('%s more worker wake(s) from a plain note', t.worker_wakes() - w0));

  -- 3. A note from the dashboard has the same effect.
  perform t.as_app('dashboard');
  w0 := t.worker_wakes();
  r := public.studio_post_message(tid, 'kody-test-0004', 'note', 'looks good so far', '[]', null, null, null);
  perform t.check(t.worker_wakes() = w0 + 1, 'BUG 3: Kody''s dashboard note also re-fires the API worker', null);

  -- 4. The API worker and the interactive chat write the same author name.
  r := public.studio_worker_post(tid, 'worker-test-0005', 'report', 'worker output', '[]', null, 'kody', t.ver(tid));
  perform t.check((select count(distinct author) from public.studio_messages where task_id = tid and request_key in ('chat-test-0003','worker-test-0005')) = 1,
                  'BUG 4: API worker and interactive ChatGPT both post as "chatgpt"',
                  (select string_agg(request_key || '=' || author, ', ') from public.studio_messages where task_id = tid and request_key in ('chat-test-0003','worker-test-0005')));

  -- 5. A Claude project thread and the Claude worker are the same identity, and handing to "claude" always wakes the routine.
  perform t.as_app('claude');
  w0 := t.claude_wakes();
  r := public.studio_post_message(tid, 'claude-test-0006', 'note', 'thread takes this', '[]', null, 'claude', t.ver(tid));
  perform t.check(t.claude_wakes() = w0 + 1, 'BUG 5: a thread taking a task (turn claude) wakes the Claude worker routine too', null);

  -- 6. The owner is called "kody" everywhere.
  perform t.check((select author from public.studio_messages where request_key = 'kody-test-0004') = 'kody', 'NOTE 6: dashboard messages are authored "kody"', null);
end $$;
