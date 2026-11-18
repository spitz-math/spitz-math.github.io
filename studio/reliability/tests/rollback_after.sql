-- Run after: seed -> migration -> some new activity -> rollback -> old functions. Old system must work again.
grant execute on function public.studio_create_task(text,text,text,text,text,jsonb), public.studio_post_message(uuid,text,text,text,jsonb,text,text,integer), public.studio_current_agent(), public.studio_note_read(uuid) to authenticated;
do $$
declare tid uuid; r jsonb;
begin
  perform t.check((select author from public.studio_messages where request_key = 'kody-seed-3') = 'kody', 'rollback: migrated history restored (kody)', null);
  perform t.check((select author from public.studio_messages where request_key = 'worker-seed-1') = 'chatgpt', 'rollback: migrated history restored (chatgpt)', null);
  perform t.check((select string_agg(body || '#' || seq || '#' || created_at, ',' order by id) from public.studio_messages where request_key like '%seed%')
                  = (select v from t.before where k = 'messages'), 'rollback: original messages identical to before migration', null);
  perform t.check((select count(*) from public.studio_identity_rollback_notes) > 0, 'rollback: post-migration rows mapped and listed', (select count(*) from public.studio_identity_rollback_notes)::text);
  perform t.check((select count(*) from public.studio_tasks where turn not in ('claude','chatgpt','kody')) = 0, 'rollback: all turns back on old values', null);
  perform t.as_app('dashboard');
  r := public.studio_create_task('kody-after-rb-1', 'arcade', 'after rollback', 'b', 'kody', '[]'); tid := (r -> 'task' ->> 'id')::uuid;
  r := public.studio_post_message(tid, 'kody-after-rb-2', 'note', 'old system works', '[]', null, 'claude', t.ver(tid));
  perform t.check(r ->> 'duplicate' = 'false', 'rollback: old functions accept old-style calls again', null);
end $$;
