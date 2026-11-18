-- Tests for 20261118040000_hold_legacy_drafts.sql (Kody: old drafts need his approval too).
create function t.who(name text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', case name
    when 'kody'    then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","session_id":"00000000-0000-0000-0000-0000000005a1"}'
    when 'claude'  then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","client_id":"00000000-0000-0000-0000-0000000000c1","session_id":"00000000-0000-0000-0000-0000000005c1"}'
    when 'chatgpt' then '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","client_id":"00000000-0000-0000-0000-0000000000c2","session_id":"00000000-0000-0000-0000-0000000005c2"}'
    when 'worker'  then '{"role":"service_role"}'
    else '' end, false);
end $$;
create function t.err(sql text) returns text language plpgsql as $$ begin execute sql; return 'none'; exception when others then return sqlerrm; end $$;
create function t.sha(id uuid) returns text language sql as $$ select sha256 from public.studio_assets where studio_assets.id = $1 $$;
create function t.st(id uuid) returns text language sql as $$ select status from public.studio_assets where studio_assets.id = $1 $$;

do $$
declare tid uuid; r jsonb; e text;
        old uuid := '00000000-0000-0000-0000-00000000aa01'; ready_old uuid := '00000000-0000-0000-0000-00000000aa02'; failed_old uuid := '00000000-0000-0000-0000-00000000aa03';
begin
  perform t.check(t.st(old) = 'held', 'an old draft is now held', t.st(old));
  perform t.check((select legacy_status from public.studio_assets where id = old) = 'draft', 'it remembers it was a draft');
  perform t.check(t.st(failed_old) = 'held' and (select legacy_status from public.studio_assets where id = failed_old) = 'failed', 'an old failed picture is now held', t.st(failed_old));
  perform t.check(t.st(ready_old) = 'ready', 'an old ready picture keeps its status', t.st(ready_old));
  perform t.check(not exists (select 1 from public.studio_assets where status in ('draft', 'failed')), 'no draft or failed pictures are left');

  perform t.who('claude');
  r := public.studio_create_task('m5-0001', 'rook-and-ruin', 'Kiln', 'b', 'spitz', '[]', 'claude_thread', 'new', null, '[]');
  tid := (r -> 'task' ->> 'id')::uuid;
  e := t.err(format('select public.studio_attach_ref(%L, %L, %L, true, %L)', tid, old, 'style', 'claude_thread'));
  perform t.check(e like '%waiting for Kody''s approval%', 'Claude cannot attach an old draft any more', e);
  e := t.err(format($q$ select public.studio_post_message(%L, 'm5-0002', 'note', 'x', jsonb_build_array(jsonb_build_object('type','asset','id',%L::text)), null, null, null, 'claude_thread') $q$, tid, old));
  perform t.check(e like '%waiting for Kody''s approval%', 'an old draft cannot be referenced in a message', e);
  e := t.err(format('select public.studio_mark_ready(%L)', old));
  perform t.check(e <> 'none', 'an old draft cannot be marked ready', e);
  e := t.err(format($q$ insert into public.studio_assets (user_id, task_id, file_name, sha256, parent_id) values ('00000000-0000-0000-0000-00000000000a', 'x', 'child.png', 'abc', %L) $q$, old));
  perform t.check(e like '%held (not approved)%', 'nothing can be made from an old draft', e);
  perform t.who('chatgpt');
  e := t.err(format('select public.studio_approve(%L, %L, %L)', old, t.sha(old), 'approved'));
  perform t.check(e like '%OAuth%', 'ChatGPT cannot approve an old draft', e);

  perform t.who('kody');
  r := public.studio_approve(old, t.sha(old), 'approved');
  perform t.check(t.st(old) = 'approved', 'Kody approves an old draft and it is usable again', t.st(old));
  perform t.who('claude');
  e := t.err(format('select public.studio_attach_ref(%L, %L, %L, true, %L)', tid, old, 'style', 'claude_thread'));
  perform t.check(e = 'none', 'after Kody''s approval Claude can attach it', e);
  perform t.who('worker');
  e := t.err(format($q$ update public.studio_assets set status = 'draft' where id = %L $q$, failed_old));
  perform t.check(e <> 'none', 'a held old picture cannot be put back to draft by a worker', e);
  perform t.check((public.studio_schema() ->> 'legacy_held') = '1', 'studio_schema reports legacy_held 1');
end $$;
