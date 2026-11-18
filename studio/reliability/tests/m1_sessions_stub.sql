-- auth.sessions as Supabase has it (only the columns the approval check reads), with one direct browser session
-- for the owner and one session per OAuth app.
create table auth.sessions (id uuid primary key, user_id uuid, oauth_client_id uuid, not_after timestamptz);
insert into auth.sessions values
  ('00000000-0000-0000-0000-0000000005a1', '00000000-0000-0000-0000-00000000000a', null, null),                                    -- Kody, phone browser
  ('00000000-0000-0000-0000-0000000005c1', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c1', null),  -- claude.ai connector
  ('00000000-0000-0000-0000-0000000005c2', '00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000c2', null),  -- chatgpt.com connector
  ('00000000-0000-0000-0000-0000000005e0', '00000000-0000-0000-0000-00000000000a', null, now() - interval '1 day');               -- ended session
