-- Local stand-ins for Supabase internals, so live studio SQL runs in plain Postgres 16.
create extension if not exists pgcrypto;
create schema auth; create schema net; create schema vault; create schema cron;
create table auth.users (id uuid primary key);
create table auth.oauth_clients (id uuid primary key, redirect_uris text, deleted_at timestamptz);
create table auth.oauth_consents (client_id uuid, user_id uuid, revoked_at timestamptz);
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
create table net.http_request_queue (id bigserial primary key, url text, body jsonb, at timestamptz default clock_timestamp());
create table net._http_response (id bigint primary key, status_code int, content text, error_msg text, created timestamptz default now());
create function net.http_post(url text, headers jsonb default '{}', body jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language sql as $$ insert into net.http_request_queue (url, body) values (url, body) returning id $$;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
insert into vault.decrypted_secrets values ('studio_worker_secret', 'test-secret'), ('claude_worker_token_one', 'test-token');
create table cron.job (jobid bigint, jobname text, schedule text, command text);
create table cron.job_run_details (jobid bigint, runid bigint, end_time timestamptz, status text);
-- test identities: one owner, a claude.ai app and a chatgpt.com app
insert into auth.users values ('00000000-0000-0000-0000-00000000000a');
insert into auth.oauth_clients values ('00000000-0000-0000-0000-0000000000c1', 'https://claude.ai/api/mcp/auth_callback', null),
                                      ('00000000-0000-0000-0000-0000000000c2', 'https://chatgpt.com/connector_platform_oauth_redirect', null);
insert into auth.oauth_consents values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a', null),
                                       ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000a', null);
create role authenticated; create role service_role; create role anon;
