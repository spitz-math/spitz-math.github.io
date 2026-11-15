-- Studio dashboard (Spitz.dev): Kody can post and create tasks from spitzmath.com/studio/.
-- The dashboard signs in directly (email link), so its token has NO client_id.
-- Connected AI apps always come through OAuth and always carry a client_id, so:
--   client_id present  -> the app's agent (claude / chatgpt), exactly as before
--   client_id missing  -> Kody, signed in on the dashboard (signups are off; the owner is the only account)
-- Nothing else changes: same tables, same write functions, same rules.

create or replace function public.studio_current_agent()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  cid uuid;
  uris text;
  hosts text[];
begin
  if auth.uid() is null then
    raise exception 'Sign in required' using errcode = '28000';
  end if;
  begin
    cid := (auth.jwt() ->> 'client_id')::uuid;
  exception when others then
    cid := null;
  end;
  if cid is null then
    if auth.jwt() ->> 'client_id' is not null then
      raise exception 'Unreadable client_id in the token' using errcode = '28000';
    end if;
    if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
      raise exception 'Anonymous sessions cannot use Task Drop' using errcode = '28000';
    end if;
    return 'kody';
  end if;
  select c.redirect_uris into uris
  from auth.oauth_clients c
  where c.id = cid and c.deleted_at is null
    and exists (select 1 from auth.oauth_consents o
                where o.client_id = c.id and o.user_id = auth.uid() and o.revoked_at is null);
  if uris is null then
    raise exception 'This app is not approved for this account' using errcode = '28000';
  end if;
  select array_agg(distinct substring(u from '^https://([^/:]+)'))
    into hosts
  from regexp_split_to_table(trim(uris), '[,[:space:]]+') as u
  where u <> '';
  if hosts = array['claude.ai'] then return 'claude'; end if;
  if hosts = array['chatgpt.com'] then return 'chatgpt'; end if;
  raise exception 'Unknown app (returns to %). Ask Claude to add it before it can use Task Drop.', array_to_string(hosts, ', ') using errcode = '28000';
end;
$$;

alter table public.studio_messages drop constraint if exists studio_messages_author_check;
alter table public.studio_messages add constraint studio_messages_author_check check (author in ('claude','chatgpt','kody'));
alter table public.studio_tasks drop constraint if exists studio_tasks_created_by_check;
alter table public.studio_tasks add constraint studio_tasks_created_by_check check (created_by in ('claude','chatgpt','kody'));

revoke all on function public.studio_current_agent() from public, anon;
grant execute on function public.studio_current_agent() to authenticated;
