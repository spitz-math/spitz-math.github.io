-- spitz.dev art worker: one settings row (priority, preferred models, spending limits, model cache) + cost columns on runs.
-- Applied 2026-11-15. Rates are USD per 1M tokens (gpt-image 2.x rate card, gpt-5 text).
create table if not exists public.studio_worker_settings (
  id integer primary key default 1 check (id = 1),
  default_priority text not null default 'quality' check (default_priority in ('quality','speed','cost')),
  preferred jsonb not null default '{"quality":"gpt-image-2.6-sunburst","speed":"gpt-image-2.6-flare","cost":"gpt-image-2.6-flare"}'::jsonb,
  quality_level jsonb not null default '{"quality":"high","speed":"medium","cost":"low"}'::jsonb,
  rates jsonb not null default '{"gpt-image":{"text_in":5,"image_in":8,"image_out":30},"text":{"gpt-5":{"in":1.25,"out":10}}}'::jsonb,
  monthly_limit_usd numeric not null default 15,
  monthly_image_cap integer not null default 150,
  model_cache jsonb,
  model_cache_at timestamptz,
  updated_at timestamptz not null default now()
);
insert into public.studio_worker_settings (id) values (1) on conflict (id) do nothing;
alter table public.studio_worker_settings enable row level security;
revoke all on public.studio_worker_settings from anon, authenticated;

alter table public.studio_worker_runs
  add column if not exists priority text,
  add column if not exists image_model text,
  add column if not exists image_size text,
  add column if not exists image_quality text,
  add column if not exists attempts integer not null default 0,
  add column if not exists error_kind text,
  add column if not exists usage jsonb,
  add column if not exists est_cost_usd numeric;
