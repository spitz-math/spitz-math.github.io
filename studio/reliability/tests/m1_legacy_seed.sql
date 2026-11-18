-- Pictures made before the locked-approvals rule (status draft / approved / ready with an old Claude-thread approval).
insert into public.studio_assets (id, user_id, task_id, file_name, sha256) values
  ('00000000-0000-0000-0000-00000000aa01', '00000000-0000-0000-0000-00000000000a', 'legacy', 'kiln_mouth.png', encode(digest('kiln_mouth', 'sha256'), 'hex')),
  ('00000000-0000-0000-0000-00000000aa02', '00000000-0000-0000-0000-00000000000a', 'legacy', 'barracks.png', encode(digest('barracks', 'sha256'), 'hex'));
insert into public.studio_approvals (asset_id, sha256, verdict, note, by_agent, by_app)
  select id, sha256, 'approved', 'Much better. This works.', 'spitz', 'claude_thread' from public.studio_assets where id = '00000000-0000-0000-0000-00000000aa02';
insert into public.studio_validations (asset_id, sha256, result, record, validator, by_agent, by_app)
  select id, sha256, 'PASS', '{}', 'art_check@test', 'claude_thread', 'claude.ai' from public.studio_assets where id = '00000000-0000-0000-0000-00000000aa02';
update public.studio_assets set status = 'ready' where id = '00000000-0000-0000-0000-00000000aa02';
