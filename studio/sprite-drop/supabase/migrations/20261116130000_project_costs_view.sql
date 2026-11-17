-- spitz.dev: cost per project, from data the worker already records (no new tables).
-- recorded_* comes from OpenAI's own token counts on finished calls.
-- interrupted_* is kept apart: runs that stopped (timeout, stall, error) before any usage was saved.
-- OpenAI may still have billed their planning call, so they are counted and given a rough
-- estimate (the average recorded planning cost), never mixed into the recorded figures.
create or replace view public.studio_project_costs
with (security_invoker = true) as
with runs as (
  select r.*, coalesce(t.project, '(no project)') as project,
         date_trunc('month', r.created_at at time zone 'America/Chicago')::date as month,
         -- picture usage: an array since worker v9, a single object ('image') before that
         case when jsonb_typeof(r.usage -> 'images') = 'array' then r.usage -> 'images'
              when jsonb_typeof(r.usage -> 'image') = 'object' then jsonb_build_array(r.usage -> 'image')
              else '[]'::jsonb end as imgs
  from public.studio_worker_runs r
  left join public.studio_tasks t on t.id = r.task_id
  where r.status <> 'skipped' or r.est_cost_usd is not null
), rates as (
  select coalesce((rates -> 'gpt-image' ->> 'text_in')::numeric, 0) as ti,
         coalesce((rates -> 'gpt-image' ->> 'image_in')::numeric, 0) as ii,
         coalesce((rates -> 'gpt-image' ->> 'image_out')::numeric, 0) as io
  from public.studio_worker_settings where id = 1
), per_run as (
  select runs.project, runs.month, runs.id, runs.status, runs.est_cost_usd,
         (select coalesce(sum(
            (coalesce((i -> 'input_tokens_details' ->> 'text_tokens')::numeric, (i ->> 'input_tokens')::numeric, 0) * rates.ti
           + coalesce((i -> 'input_tokens_details' ->> 'image_tokens')::numeric, 0) * rates.ii
           + coalesce((i ->> 'output_tokens')::numeric, 0) * rates.io) / 1e6), 0)
          from jsonb_array_elements(runs.imgs) i where jsonb_typeof(i) = 'object') as image_usd,
         (select count(*) from jsonb_array_elements(runs.imgs) i where jsonb_typeof(i) = 'object')::int as pictures,
         runs.usage -> 'plan' is not null and jsonb_typeof(runs.usage -> 'plan') = 'object' as planned,
         runs.est_cost_usd is null and runs.status in ('error', 'stalled') as interrupted,
         runs.image_quality
  from runs cross join rates
), plan_avg as (
  select coalesce(avg(greatest(est_cost_usd - image_usd, 0)) filter (where planned and est_cost_usd is not null), 0) as usd from per_run
)
select project, month,
       count(*) filter (where not interrupted)                                   as runs,
       sum(pictures)::int                                                        as pictures,
       round(sum(coalesce(est_cost_usd, 0)), 4)                                  as recorded_usd,
       round(sum(coalesce(est_cost_usd, 0) - image_usd) filter (where est_cost_usd is not null), 4) as recorded_planning_usd,
       round(sum(image_usd), 4)                                                  as recorded_picture_usd,
       count(*) filter (where interrupted)                                       as interrupted_runs,
       round(count(*) filter (where interrupted) * (select usd from plan_avg), 4) as interrupted_est_usd,
       jsonb_strip_nulls(jsonb_build_object(
         'high', nullif(count(*) filter (where image_quality = 'high'), 0),
         'medium', nullif(count(*) filter (where image_quality = 'medium'), 0),
         'low', nullif(count(*) filter (where image_quality = 'low'), 0)))       as runs_by_quality
from per_run
group by project, month
order by month desc, recorded_usd desc;

comment on view public.studio_project_costs is
  'spitz.dev cost per project and month from studio_worker_runs. recorded_* = OpenAI token counts on finished calls; interrupted_* = runs that stopped before usage was saved (rough estimate at the average planning cost, kept separate).';

revoke all on public.studio_project_costs from anon;
grant select on public.studio_project_costs to authenticated, service_role;
