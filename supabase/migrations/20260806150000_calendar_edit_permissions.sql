-- Three-mode calendar edit permission (addendum §15.2), replacing the
-- flat "admins write, everyone else reads" rule from task 19.

alter table public.calendar_entries add column set_by_profile_id uuid references public.profiles (id);
alter table public.calendar_entries add column set_at timestamptz;

-- Stamp from the session, same reasoning as task_instances'
-- status_set_by/status_set_at trigger: never trust a client-supplied
-- actor, especially now that members can write their own rows.
create function public.stamp_calendar_entry_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.set_by_profile_id := auth.uid();
  new.set_at := now();
  return new;
end;
$$;

create trigger calendar_entries_stamp_set
  before insert or update on public.calendar_entries
  for each row
  execute function public.stamp_calendar_entry_set();

-- Reads the live app_settings.calendar_edit_permission on every check
-- (not cached) so flipping the setting takes effect immediately without
-- rewriting any existing row, per addendum §15.2's "changing the
-- setting never rewrites existing entries."
create function public.can_edit_calendar_entry(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() in ('admin', 'master_admin')
    or (
      select
        case (select calendar_edit_permission from public.app_settings limit 1)
          when 'members_all' then true
          when 'members_own' then target_profile_id = auth.uid()
          else false
        end
    );
$$;

drop policy calendar_entries_write on public.calendar_entries;

create policy calendar_entries_write on public.calendar_entries
  for all to authenticated
  using (public.can_edit_calendar_entry(profile_id))
  with check (public.can_edit_calendar_entry(profile_id));
