-- Undo 20261118040000_hold_legacy_drafts.sql: old pictures Kody has not decided on go back to draft / failed.
-- Pictures he approved or rejected since keep that decision. The status guard normally stops held pictures from going
-- anywhere but approved/rejected, so it is switched off for this one update only.
begin;
alter table public.studio_assets disable trigger studio_assets_status_guard;
update public.studio_assets set status = legacy_status where status = 'held' and legacy_status is not null;
alter table public.studio_assets enable trigger studio_assets_status_guard;
alter table public.studio_assets drop column if exists legacy_status;
create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1, 'approvals', 2, 'proofs', 1,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;
commit;
