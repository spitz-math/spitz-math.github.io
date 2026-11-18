-- spitz.dev: old pictures need Kody's approval too (Kody's decision 2026-11-18 03:55Z, "Hold all old drafts").
-- Every picture made before approvals existed (status draft) or that failed its check (status failed) becomes HELD:
-- nobody can attach, reference, fetch for a task, mark ready or build on it until Kody approves that exact file on
-- spitz.dev. Approved, ready, rejected and already-held pictures don't change. legacy_status remembers the old
-- status, so the approve page can list these apart from new work and the rollback can put them back exactly.
begin;

alter table public.studio_assets add column if not exists legacy_status text check (legacy_status in ('draft', 'failed'));

update public.studio_assets set legacy_status = status, status = 'held' where status in ('draft', 'failed');

create or replace function public.studio_schema()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('identities', 2, 'typed_tasks', 1, 'asset_status', 1, 'approvals', 2, 'proofs', 1, 'legacy_held', 1,
    'turns', jsonb_build_array('spitz', 'chatgpt_chat', 'openai_worker', 'claude', 'claude_thread'))
$$;

commit;

-- check: should return 0 draft, 0 failed
select status, count(*) from public.studio_assets group by status order by 1;
