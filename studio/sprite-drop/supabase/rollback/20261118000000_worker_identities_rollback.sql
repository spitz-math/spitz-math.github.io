-- ROLLBACK for 20261118000000_worker_identities.sql.
-- Step 1 (this file): restore every renamed value from studio_identity_renames and the old constraints.
-- Step 2: re-apply studio/reliability/live_snapshot/functions_2026-11-17.sql (the exact pre-migration functions).
-- Messages written AFTER the migration with new-only identities (claude_thread, a chatgpt_chat handoff, ...)
-- have no old equivalent; they are mapped to the nearest old value and listed in studio_identity_rollback_notes.
begin;
do $$ begin
  if exists (select 1 from public.studio_worker_runs where status = 'started' and coalesce(heartbeat_at, created_at) > now() - interval '5 minutes') then
    raise exception 'An API worker run is still active. Wait for it to finish, then roll back.';
  end if;
end $$;
alter table public.studio_tasks disable trigger user;
create temp table studio_identity_rollback_notes_pre (row_id text) on commit drop;
alter table public.studio_tasks drop constraint if exists studio_tasks_turn_check, drop constraint if exists studio_tasks_created_by_check, drop constraint if exists studio_tasks_created_by_app_check;
alter table public.studio_messages drop constraint if exists studio_messages_author_check, drop constraint if exists studio_messages_set_turn_check, drop constraint if exists studio_messages_author_app_check;

-- open tasks never go back onto the old auto-running "chatgpt" turn: they park on kody (and are listed)
insert into studio_identity_rollback_notes_pre (row_id) select t.id::text from public.studio_tasks t join public.studio_identity_renames r
  on r.tbl = 'studio_tasks' and r.col = 'turn' and r.row_id = t.id::text and t.turn = r.new_value where r.old_value = 'chatgpt' and t.status = 'open';
update public.studio_tasks t set turn = case when r.old_value = 'chatgpt' and t.status = 'open' then 'kody' else r.old_value end
  from public.studio_identity_renames r where r.tbl = 'studio_tasks' and r.col = 'turn' and r.row_id = t.id::text and t.turn = r.new_value;
update public.studio_tasks t set created_by = r.old_value from public.studio_identity_renames r where r.tbl = 'studio_tasks' and r.col = 'created_by' and r.row_id = t.id::text;
update public.studio_messages m set author = r.old_value from public.studio_identity_renames r where r.tbl = 'studio_messages' and r.col = 'author' and r.row_id = m.id::text;
update public.studio_messages m set set_turn = r.old_value from public.studio_identity_renames r where r.tbl = 'studio_messages' and r.col = 'set_turn' and r.row_id = m.id::text;
update public.studio_run_events e set actor = r.old_value from public.studio_identity_renames r where r.tbl = 'studio_run_events' and r.col = 'actor' and r.row_id = e.id::text;

-- rows created after the migration
create table if not exists public.studio_identity_rollback_notes (tbl text, row_id text, col text, was text, now_is text, at timestamptz default now());
alter table public.studio_identity_rollback_notes enable row level security;
with m(newv, oldv) as (values ('spitz','kody'), ('chatgpt_chat','chatgpt'), ('openai_worker','chatgpt'), ('claude_thread','claude'))
insert into public.studio_identity_rollback_notes (tbl, row_id, col, was, now_is)
select 'studio_tasks', t.id::text, 'turn', t.turn, m.oldv from public.studio_tasks t join m on m.newv = t.turn
union all select 'studio_tasks', t.id::text, 'created_by', t.created_by, m.oldv from public.studio_tasks t join m on m.newv = t.created_by
union all select 'studio_messages', x.id::text, 'author', x.author, m.oldv from public.studio_messages x join m on m.newv = x.author
union all select 'studio_messages', x.id::text, 'set_turn', x.set_turn, m.oldv from public.studio_messages x join m on m.newv = x.set_turn
union all select 'studio_run_events', x.id::text, 'actor', x.actor, m.oldv from public.studio_run_events x join m on m.newv = x.actor
union all select 'studio_tasks', row_id, 'turn', 'chatgpt (open)', 'kody (parked so the API worker cannot start)' from studio_identity_rollback_notes_pre;
-- a task waiting on the chat must not start the API worker after rollback: park it on kody instead
update public.studio_tasks set turn = case turn when 'chatgpt_chat' then 'kody' when 'openai_worker' then 'chatgpt' when 'spitz' then 'kody' when 'claude_thread' then 'kody' else turn end;
update public.studio_tasks set created_by = case created_by when 'spitz' then 'kody' when 'chatgpt_chat' then 'chatgpt' when 'openai_worker' then 'chatgpt' when 'claude_thread' then 'claude' else created_by end;
update public.studio_messages set author = case author when 'spitz' then 'kody' when 'chatgpt_chat' then 'chatgpt' when 'openai_worker' then 'chatgpt' when 'claude_thread' then 'claude' else author end,
  set_turn = case set_turn when 'spitz' then 'kody' when 'chatgpt_chat' then 'chatgpt' when 'openai_worker' then 'chatgpt' when 'claude_thread' then 'claude' else set_turn end;
update public.studio_run_events set actor = case actor when 'spitz' then 'kody' when 'chatgpt_chat' then 'chatgpt' when 'openai_worker' then 'chatgpt' when 'claude_thread' then 'claude' else actor end;

alter table public.studio_messages drop column if exists author_app;
alter table public.studio_tasks drop column if exists created_by_app;
alter table public.studio_tasks add constraint studio_tasks_turn_check check (turn in ('claude','chatgpt','kody'));
alter table public.studio_tasks add constraint studio_tasks_created_by_check check (created_by in ('claude','chatgpt','kody'));
alter table public.studio_messages add constraint studio_messages_author_check check (author in ('claude','chatgpt','kody'));
alter table public.studio_messages add constraint studio_messages_set_turn_check check (set_turn in ('claude','chatgpt','kody'));
alter table public.studio_tasks enable trigger user;

drop function if exists public.studio_create_task(text, text, text, text, text, jsonb, text);
drop function if exists public.studio_post_message(uuid, text, text, text, jsonb, text, text, integer, text);
drop function if exists public.studio_note_read(uuid);
drop function if exists public.studio_current_agent(text);
drop function if exists public.studio_resolve_author(text);
drop function if exists public.studio_current_app();
drop function if exists public.studio_check_turn(text);
drop function if exists public.studio_schema();
commit;
-- NOW run step 2: studio/reliability/live_snapshot/functions_2026-11-17.sql, then re-grant execute on
-- studio_create_task, studio_post_message, studio_current_agent, studio_note_read to authenticated.
