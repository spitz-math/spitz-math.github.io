create schema t;
create table t.results (n serial, name text, ok boolean, detail text);
create function t.check(ok boolean, name text, detail text default null) returns void language sql as $$ insert into t.results (name, ok, detail) values (name, coalesce(ok, false), detail) $$;
-- act as an app: 'dashboard' (owner, no client), 'claude' (claude.ai), 'chatgpt' (chatgpt.com)
create function t.as_app(app text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case app
    when 'dashboard' then '{"sub":"00000000-0000-0000-0000-00000000000a"}'
    when 'claude' then '{"sub":"00000000-0000-0000-0000-00000000000a","client_id":"00000000-0000-0000-0000-0000000000c1"}'
    when 'chatgpt' then '{"sub":"00000000-0000-0000-0000-00000000000a","client_id":"00000000-0000-0000-0000-0000000000c2"}'
    else '{}' end, false);
end $$;
create function t.worker_wakes() returns bigint language sql as $$ select count(*) from net.http_request_queue where url like '%/chatgpt-worker' $$;
create function t.claude_wakes() returns bigint language sql as $$ select count(*) from net.http_request_queue where url like '%/routines/%' $$;
create function t.ver(id uuid) returns int language sql as $$ select version from public.studio_tasks where studio_tasks.id = $1 $$;
