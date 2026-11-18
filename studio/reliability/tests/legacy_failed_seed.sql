-- One old picture whose check failed (status failed), made before the locked-approvals rule.
insert into public.studio_assets (id, user_id, task_id, file_name, sha256) values
  ('00000000-0000-0000-0000-00000000aa03', '00000000-0000-0000-0000-00000000000a', 'legacy', 'old_failed.png', encode(digest('old_failed', 'sha256'), 'hex'));
update public.studio_assets set status = 'failed' where id = '00000000-0000-0000-0000-00000000aa03';
