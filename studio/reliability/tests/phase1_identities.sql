-- Tests for migration 20261118000000_worker_identities.sql. History is seeded with the OLD values first
-- (seed_history.sql runs before the migration), then the migrated system is exercised.
do $$
declare tid uuid; r jsonb; w0 bigint; c0 bigint; e text; n int;
begin
  -- ---------- history migration ----------
  perform t.check((select count(*) from public.studio_tasks where turn in ('kody','chatgpt') or created_by in ('kody','chatgpt')) = 0, 'migration: no old turn/created_by values left', null);
  perform t.check((select count(*) from public.studio_messages where author in ('kody','chatgpt') or set_turn in ('kody','chatgpt')) = 0, 'migration: no old author/set_turn values left', null);
  perform t.check((select turn from public.studio_tasks where request_key = 'seed-task-open-chatgpt') = 'chatgpt_chat', 'migration: open task on old "chatgpt" moves to chatgpt_chat (never auto-runs)', null);
  perform t.check((select turn from public.studio_tasks where request_key = 'seed-task-open-kody') = 'spitz', 'migration: open task on kody moves to spitz', null);
  perform t.check((select author from public.studio_messages where request_key = 'worker-seed-1') = 'openai_worker', 'migration: worker-keyed message becomes openai_worker', null);
  perform t.check((select author from public.studio_messages where request_key = 'chatgpt-seed-2') = 'chatgpt_chat', 'migration: chat message becomes chatgpt_chat', null);
  perform t.check((select author from public.studio_messages where request_key = 'kody-seed-3') = 'spitz', 'migration: kody message becomes spitz', null);
  perform t.check((select string_agg(body || '#' || seq || '#' || created_at, ',' order by id) from public.studio_messages) = (select v from t.before where k = 'messages'),
                  'migration: every message body, seq and timestamp unchanged', null);
  perform t.check((select count(*) from public.studio_messages) = (select v::int from t.before where k = 'message_count'), 'migration: message count unchanged', null);
  perform t.check((select string_agg(id || '#' || version || '#' || user_id, ',' order by id) from public.studio_tasks) = (select v from t.before where k = 'tasks'),
                  'migration: task ids, versions and ownership unchanged', null);
  perform t.check((select count(*) from public.studio_identity_renames) = (select v::int from t.before where k = 'old_values'), 'migration: every renamed value is logged for rollback',
                  (select count(*) from public.studio_identity_renames)::text || ' logged');
  perform t.check(t.worker_wakes() = (select v::int from t.before where k = 'worker_wakes') and t.claude_wakes() = (select v::int from t.before where k = 'claude_wakes'),
                  'migration: no worker or Claude wake fired during the migration', null);
  perform t.check((select count(*) from net.http_request_queue) = (select v::int from t.before where k = 'http'), 'migration: no phone push fired during the migration', null);

  -- ---------- routing ----------
  perform t.as_app('claude');
  r := public.studio_create_task('claude-new-0001', 'arcade', 'Barracks props', 'brief', 'claude_thread', '[]', 'claude_thread');
  tid := (r -> 'task' ->> 'id')::uuid;
  perform t.check((select created_by || '/' || created_by_app from public.studio_tasks where id = tid) = 'claude_thread/claude.ai', 'routing: thread-created task records declared identity + verified app', null);

  w0 := t.worker_wakes(); c0 := t.claude_wakes();
  r := public.studio_post_message(tid, 'claude-new-0002', 'note', 'to Kody''s chat', '[]', null, 'chatgpt_chat', t.ver(tid), 'claude_thread');
  perform t.check(t.worker_wakes() = w0 and t.claude_wakes() = c0, 'routing: handing to chatgpt_chat wakes NOBODY (fixes bug 1)', null);

  perform t.as_app('chatgpt');
  r := public.studio_post_message(tid, 'chat-new-0003', 'note', 'fetched refs', '[]', null, null, null);
  perform t.check((r -> 'message' ->> 'author') = 'chatgpt_chat' and t.worker_wakes() = w0, 'routing: interactive ChatGPT posts as chatgpt_chat and wakes nobody', null);

  r := public.studio_post_message(tid, 'chat-new-0004', 'report', 'here are props', '[]', null, 'openai_worker', t.ver(tid));
  perform t.check(t.worker_wakes() = w0 + 1, 'routing: handing to openai_worker wakes the API worker exactly once', null);

  perform t.as_app('dashboard');
  r := public.studio_post_message(tid, 'kody-new-0005', 'note', 'also add a rack', '[]', null, null, null);
  perform t.check(t.worker_wakes() = w0 + 1, 'routing: a note on a task already on openai_worker does NOT start another run (fixes bugs 2-3)', null);
  perform t.check((r -> 'message' ->> 'author') = 'spitz' and (r -> 'message' ->> 'author_app') = 'dashboard', 'identity: dashboard posts as spitz', null);

  r := public.studio_worker_post(tid, 'worker-new-0006', 'report', 'worker output', '[]', null, 'spitz', t.ver(tid));
  perform t.check((r -> 'message' ->> 'author') = 'openai_worker' and (r -> 'message' ->> 'author_app') = 'api_worker', 'identity: API worker posts as openai_worker (fixes bug 4)', null);

  perform t.as_app('claude');
  c0 := t.claude_wakes();
  r := public.studio_post_message(tid, 'claude-new-0007', 'note', 'thread takes it', '[]', null, 'claude_thread', t.ver(tid), 'claude_thread');
  perform t.check(t.claude_wakes() = c0, 'routing: claude_thread wakes no Claude routine (fixes bug 5)', null);
  r := public.studio_post_message(tid, 'claude-new-0008', 'note', 'over to the worker', '[]', null, 'claude', t.ver(tid), 'claude_thread');
  perform t.check(t.claude_wakes() = c0 + 1, 'routing: handing to claude still wakes the Claude worker', null);

  -- reopen on openai_worker wakes once more (done -> open)
  perform t.as_app('dashboard');
  r := public.studio_post_message(tid, 'kody-new-0009', 'note', 'to worker', '[]', null, 'openai_worker', t.ver(tid));
  w0 := t.worker_wakes();
  r := public.studio_post_message(tid, 'kody-new-0010', 'decision', 'done', '[]', 'done', null, t.ver(tid));
  r := public.studio_post_message(tid, 'kody-new-0011', 'note', 'reopen', '[]', 'open', null, t.ver(tid));
  perform t.check(t.worker_wakes() = w0 + 1, 'routing: reopening a task that sits on openai_worker wakes it once', null);

  -- ---------- refusals ----------
  perform t.as_app('claude');
  begin r := public.studio_post_message(tid, 'claude-new-0012', 'note', 'x', '[]', null, null, null); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like 'Say who you are%', 'identity: a claude.ai call without "as" is refused (no silent guess)', left(e, 60));
  begin r := public.studio_post_message(tid, 'claude-new-0013', 'note', 'x', '[]', null, null, null, 'spitz'); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like 'Say who you are%', 'identity: a claude.ai call cannot claim to be spitz', left(e, 60));
  begin r := public.studio_post_message(tid, 'claude-new-0014', 'note', 'x', '[]', null, 'chatgpt', t.ver(tid), 'claude'); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like '"chatgpt" was split%', 'refusal: old "chatgpt" turn refused with an explanation', left(e, 60));
  begin r := public.studio_post_message(tid, 'claude-new-0015', 'note', 'x', '[]', null, 'kody', t.ver(tid), 'claude'); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like 'The owner is now "spitz"%', 'refusal: old "kody" turn refused with an explanation', left(e, 60));
  perform t.as_app('chatgpt');
  begin r := public.studio_post_message(tid, 'chat-new-0016', 'note', 'x', '[]', null, null, null, 'openai_worker'); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like 'ChatGPT through this connector%', 'identity: the ChatGPT chat cannot claim to be the API worker', left(e, 60));
  begin r := public.studio_worker_post(tid, 'worker-new-0017', 'note', 'x', '[]', null, 'openai_worker', t.ver(tid)); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like 'The API worker cannot hand%', 'refusal: the API worker cannot hand a task to itself', left(e, 60));
  begin insert into public.studio_messages (task_id, user_id, seq, author, author_app, kind, body, request_key)
        values (tid, '00000000-0000-0000-0000-00000000000a', 999, 'openai_worker', 'claude.ai', 'note', 'forged', 'forge-0001'); e := 'none';
  exception when others then e := sqlerrm; end;
  perform t.check(e like '%author_app_check%', 'constraint: author must match the verified app even on a direct insert', left(e, 60));

  -- ---------- old callers ----------
  perform t.as_app('dashboard');
  r := public.studio_post_message(tid, 'kody-new-0018', 'note', 'old-style call, 8 args', '[]', null, null, null);
  perform t.check(r ->> 'duplicate' = 'false', 'compat: a call without p_as still works for the dashboard', null);
  perform t.check(public.studio_current_agent() = 'spitz', 'compat: studio_current_agent() with no args still works', null);
  perform t.check((public.studio_schema() ->> 'identities') = '2', 'compat: studio_schema() reports the new scheme for the dashboard', null);
end $$;
