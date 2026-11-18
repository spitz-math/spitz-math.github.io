insert into public.studio_tasks (user_id, project, title, brief, turn, created_by, request_key) values ('00000000-0000-0000-0000-00000000000a','arcade','x','b','chatgpt','claude','guard-task-1');
insert into public.studio_worker_runs (task_id, user_id, task_version, status, heartbeat_at) select id, user_id, 1, 'started', now() from public.studio_tasks where request_key='guard-task-1';
