create trigger studio_tasks_wake_worker after insert or update on public.studio_tasks for each row execute function public.studio_tasks_wake_worker();
create trigger studio_tasks_wake_claude after insert or update on public.studio_tasks for each row execute function public.studio_tasks_wake_claude();
create trigger studio_tasks_notify_phone after insert or update on public.studio_tasks for each row execute function public.studio_notify_phone();
