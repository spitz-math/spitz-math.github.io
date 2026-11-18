-- After the rollback: undecided old pictures are back to draft / failed; an approved one keeps its approval.
do $$ begin
  perform t.check((select status from public.studio_assets where id = '00000000-0000-0000-0000-00000000aa01') = 'draft', 'rollback: old draft is a draft again');
  perform t.check((select status from public.studio_assets where id = '00000000-0000-0000-0000-00000000aa03') = 'failed', 'rollback: old failed picture is failed again');
  perform t.check((select status from public.studio_assets where id = '00000000-0000-0000-0000-00000000aa02') = 'ready', 'rollback: ready picture unchanged');
  perform t.check(not exists (select 1 from information_schema.columns where table_name = 'studio_assets' and column_name = 'legacy_status'), 'rollback: legacy_status column gone');
  perform t.check(public.studio_schema() ? 'legacy_held' = false, 'rollback: studio_schema back to M3');
end $$;
