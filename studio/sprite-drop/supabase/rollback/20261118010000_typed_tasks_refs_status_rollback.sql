-- ROLLBACK for 20261118010000_typed_tasks_refs_status.sql (run BEFORE rolling back the identity migration).
-- Keeps every asset and message. Drops the typed-task columns, reference/fetch/validation/approval tables
-- (export them first if they hold anything worth keeping: they are evidence records, not art).
begin;
drop trigger if exists studio_tasks_gate on public.studio_tasks;
drop trigger if exists studio_assets_gate on public.studio_assets;
drop trigger if exists studio_assets_status_guard on public.studio_assets;
drop function if exists public.studio_tasks_gate(), public.studio_assets_gate(), public.studio_assets_status_guard(),
  public.studio_task_readiness(uuid), public.studio_attach_ref(uuid, uuid, text, boolean, text), public.studio_detach_ref(uuid, uuid, text),
  public.studio_log_fetch(uuid, uuid, text), public.studio_record_validation(uuid, text, text, jsonb, jsonb, text, text),
  public.studio_review_asset(uuid, text, text), public.studio_mark_ready(uuid);
drop function if exists public.studio_create_task(text, text, text, text, text, jsonb, text, text, jsonb, jsonb);
drop table if exists public.studio_task_refs, public.studio_asset_fetches, public.studio_validations, public.studio_approvals;
alter table public.studio_tasks drop column if exists job_type, drop column if exists spec;
alter table public.studio_assets drop column if exists status, drop column if exists evidence;
commit;
-- THEN re-create the Phase 1 studio_create_task and studio_schema by re-running sections 5-6 and the
-- grants of 20261118000000_worker_identities.sql (or roll back Phase 1 too).
