-- Tests for 20261118030000_parents_and_proofs.sql (on top of M1, with pictures made before the rules).
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
create function t.drop(name text, task text, parent uuid default null) returns uuid language sql as $$
  insert into public.studio_assets (user_id, task_id, file_name, original_name, sha256, parent_id)
  values ('00000000-0000-0000-0000-00000000000a', task, name, name, encode(digest(name || clock_timestamp()::text, 'sha256'), 'hex'), parent) returning id $$;
create function t.sha(id uuid) returns text language sql as $$ select sha256 from public.studio_assets where studio_assets.id = $1 $$;
create function t.st(id uuid) returns text language sql as $$ select status from public.studio_assets where studio_assets.id = $1 $$;
create function t.proof(id uuid, kind text, ok boolean) returns jsonb language sql as $$
  select public.studio_record_proof($1, t.sha($1), (select t.sha(parent_id) from public.studio_assets where studio_assets.id = $1), $2, $3, 'test proof', '{}', 'proof.ts@test') $$;

do $$
declare tid uuid; orig uuid; conv uuid; trim1 uuid; anim uuid; pit3 uuid; x uuid; e text; r jsonb; ap record; pid bigint;
        legacy uuid := '00000000-0000-0000-0000-00000000aa01'; ready_old uuid := '00000000-0000-0000-0000-00000000aa02';
begin
  perform t.who('claude');
  r := public.studio_create_task('m3-0001', 'rook-and-ruin', 'Kiln forge', 'b', 'spitz', '[]', 'claude_thread', 'new', null, '[]');
  tid := (r -> 'task' ->> 'id')::uuid;

  -- 1. parents must be approved
  perform t.who('chatgpt'); orig := t.drop('forge_original.png', tid::text);
  perform t.who('claude');
  e := t.err(format($q$ select t.drop('forge_1x.png', %L, %L) $q$, tid::text, orig));
  perform t.check(e like 'made_from:%held%', 'parent: nothing can be made from a held original', left(e, 70));
  e := t.err(format($q$ select t.drop('kiln_mouth_1x.png', 'legacy', %L) $q$, legacy));
  perform t.check(e like 'made_from:%draft%approve%', 'parent: nothing can be made from a never-approved legacy picture', left(e, 90));
  x := t.drop('barracks_trim.png', 'legacy', ready_old);
  perform t.check(t.st(x) = 'held', 'parent: an approved (ready) legacy picture can be a parent; the child is held', t.st(x));
  perform t.who('kody'); r := public.studio_approve(orig, t.sha(orig), 'approved');
  perform t.check(t.st(orig) = 'approved', 'parent: Kody approves the original', null);

  -- 2. a pixel-preserving proof approves the child automatically, and says so
  perform t.who('claude'); trim1 := t.drop('forge_trimmed.png', tid::text, orig);
  perform t.who('worker'); r := t.proof(trim1, 'same_content', true);
  select * into ap from public.studio_approvals where asset_id = trim1 order by id desc limit 1;
  perform t.check((r ->> 'auto_approved')::boolean and t.st(trim1) = 'approved', 'proof: a pixel-preserving child is approved automatically', r::text);
  perform t.check(ap.method = 'proof' and ap.by_agent = 'proof' and ap.user_id is null and ap.proof_id = (r ->> 'proof_id')::bigint and ap.sha256 = t.sha(trim1),
                  'proof: the approval says proof, has no user, and points at its proof row', null);

  -- 3. a 1x conversion that is not pixel-preserving stays held for Kody
  perform t.who('claude'); conv := t.drop('forge_1x.png', tid::text, orig);
  perform t.who('worker'); r := t.proof(conv, 'none', false);
  perform t.check(not (r ->> 'auto_approved')::boolean and t.st(conv) = 'held' and r ->> 'why_not' like 'not pixel-preserving%', 'proof: a 1x conversion is held for Kody', r ->> 'why_not');
  r := t.proof(conv, 'none', true);
  perform t.check(not (r ->> 'pixel_preserving')::boolean and t.st(conv) = 'held', 'proof: kind "none" can never count as pixel-preserving', null);
  e := t.err(format($q$ select public.studio_record_proof(%L, %L, %L, 'identical', true, 's', '{}', 'x') $q$, conv, repeat('0', 64), t.sha(orig)));
  perform t.check(e like 'The proof was computed on different files%' and t.st(conv) = 'held', 'proof: a proof on other bytes is refused', left(e, 60));
  e := t.err(format($q$ select public.studio_record_proof(%L, %L, %L, 'identical', true, 's', '{}', 'x') $q$, orig, t.sha(orig), t.sha(orig)));
  perform t.check(e like '%names no parent%', 'proof: a picture with no parent cannot be proved', left(e, 60));

  -- 4. nobody can fake a proof approval
  foreach e in array array['worker', 'claude', 'kody', 'none'] loop
    perform t.who(e);
    pid := (select id from public.studio_proofs where asset_id = conv order by id limit 1);   -- a real but NOT pixel-preserving proof
    perform t.check(t.err(format($q$ insert into public.studio_approvals (asset_id, sha256, verdict, by_agent, by_app, method, proof_id)
                          values (%L, %L, 'approved', 'proof', 'x', 'proof', %s) $q$, conv, t.sha(conv), pid)) <> 'none' and t.st(conv) = 'held',
                    'fake proof approval refused (not pixel-preserving proof): ' || e, null);
    pid := (select id from public.studio_proofs where asset_id = trim1 order by id limit 1);   -- a good proof, but for another file
    perform t.check(t.err(format($q$ insert into public.studio_approvals (asset_id, sha256, verdict, by_agent, by_app, method, proof_id)
                          values (%L, %L, 'approved', 'proof', 'x', 'proof', %s) $q$, conv, t.sha(conv), pid)) <> 'none' and t.st(conv) = 'held',
                    'fake proof approval refused (proof of another file): ' || e, null);
    perform t.check(t.err(format($q$ insert into public.studio_proofs (asset_id, parent_id, asset_sha256, parent_sha256, kind, pixel_preserving, summary, checker)
                          values (%L, %L, %L, %L, 'identical', true, 's', 'x') $q$, conv, orig, t.sha(conv), t.sha(orig))) <> 'none'
                    or not has_table_privilege(case e when 'worker' then 'service_role' when 'none' then 'anon' else 'authenticated' end, 'public.studio_proofs', 'insert'),
                    'proof rows cannot be written directly: ' || e, null);
  end loop;
  perform t.check(not has_function_privilege('authenticated', 'public.studio_record_proof(uuid, text, text, text, boolean, text, jsonb, text)', 'execute')
                  and not has_function_privilege('anon', 'public.studio_record_proof(uuid, text, text, text, boolean, text, jsonb, text)', 'execute')
                  and has_function_privilege('service_role', 'public.studio_record_proof(uuid, text, text, text, boolean, text, jsonb, text)', 'execute'),
                  'proof: only the server key can record proofs (not ChatGPT, Claude or the signed-in page)', null);
  perform t.check(not has_table_privilege('service_role', 'public.studio_proofs', 'insert') and not has_table_privilege('authenticated', 'public.studio_proofs', 'insert'),
                  'proof rows: no role may insert them directly', null);
  perform t.who('none');
  e := t.err(format($q$ update public.studio_proofs set pixel_preserving = true where asset_id = %L $q$, conv));
  perform t.check(e like 'Proofs are permanent%', 'proofs cannot be edited', left(e, 40));

  -- 5. Kody approves the conversion, then an animation made from it is held (new frames are creative)
  perform t.who('kody'); r := public.studio_approve(conv, t.sha(conv), 'approved');
  perform t.who('claude'); anim := t.drop('forge_anim.png', tid::text, conv);
  perform t.who('worker'); r := t.proof(anim, 'none', false);
  perform t.check(t.st(anim) = 'held', 'animation from the approved sprite: held for Kody', null);

  -- 6. the Ember Kiln substitution: a different pit made "from" the approved original is held; with no parent it is held too
  perform t.who('claude'); pit3 := t.drop('pit_round3.png', tid::text, orig);
  perform t.who('worker'); r := t.proof(pit3, 'none', false);
  perform t.check(t.st(pit3) = 'held', 'Ember Kiln: a valid but different pit claiming the approved original stays held', null);
  perform t.who('claude');
  e := t.err(format($q$ select public.studio_post_message(%L, 'm3-0002', 'report', 'delivered', %L, null, null, null, 'claude_thread') $q$, tid, jsonb_build_array(jsonb_build_object('type', 'asset', 'id', pit3))));
  perform t.check(e like '%waiting for Kody''s approval%', 'Ember Kiln: the substituted pit cannot be delivered', left(e, 60));

  -- 7. refine / pixel_edit / composite need an APPROVED source
  perform t.who('claude');
  r := public.studio_create_task('m3-0003', 'rook-and-ruin', 'Retouch kiln mouth', 'b', 'claude_thread', '[]', 'claude_thread', 'refine', '{"kind":"prop"}', '[]');
  r := public.studio_attach_ref((r -> 'task' ->> 'id')::uuid, legacy, 'source', true, 'claude_thread');
  perform t.check(not (r ->> 'ready')::boolean and r::text like '%source%draft%approves it first%', 'refine: a never-approved (legacy draft) source blocks the hand-off', r -> 'missing' ->> 0);
  r := public.studio_create_task('m3-0004', 'rook-and-ruin', 'Retouch forge', 'b', 'claude_thread', '[]', 'claude_thread', 'pixel_edit', '{"kind":"prop"}', '[]');
  r := public.studio_attach_ref((r -> 'task' ->> 'id')::uuid, conv, 'source', true, 'claude_thread');
  perform t.check((r ->> 'ready')::boolean, 'pixel_edit: an approved source is enough', r::text);

  -- 8. lineage walks back to the original with every decision
  perform t.who('kody'); r := public.studio_approve(anim, t.sha(anim), 'approved');
  r := public.studio_asset_lineage(anim);
  perform t.check(jsonb_array_length(r) = 3 and r -> 0 ->> 'id' = anim::text and r -> 1 ->> 'id' = conv::text and r -> 2 ->> 'id' = orig::text
                  and (r -> 0 -> 'decision' ->> 'by_kody')::boolean and (r -> 2 -> 'decision' ->> 'by_kody')::boolean,
                  'lineage: animation -> sprite -> original, each approved by Kody', null);
  r := public.studio_asset_lineage(trim1);
  perform t.check(r -> 0 -> 'decision' ->> 'method' = 'proof' and r -> 0 -> 'decision' -> 'proof' ->> 'kind' = 'same_content' and not (r -> 0 -> 'decision' ->> 'by_kody')::boolean,
                  'lineage: a proof approval shows its proof, not Kody', null);

  -- 9. M1 rules still hold
  perform t.who('claude'); x := t.drop('forge_v9.png', tid::text, orig);
  e := t.err(format($q$ select public.studio_approve(%L, %L, 'approved') $q$, x, t.sha(x)));
  perform t.check(e like 'Approvals cannot come from an app connected through OAuth%' and t.st(x) = 'held', 'M1: Claude still cannot approve', left(e, 60));
  perform t.who('worker');
  e := t.err(format($q$ update public.studio_assets set status = 'approved' where id = %L $q$, x));
  perform t.check(e like 'Only Kody''s approval%' and t.st(x) = 'held', 'M1: the server key still cannot set approved', left(e, 60));
end $$;
