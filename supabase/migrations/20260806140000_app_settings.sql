-- Application-wide configurable settings (addendum §15.1): a singleton
-- row, editable by admins only, readable by everyone. Every change is
-- logged to settings_events for the same "config changes are auditable
-- too" reason task_events exists for tasks.

create type public.calendar_edit_permission as enum (
  'admins_only',
  'members_own',
  'members_all'
);

-- id is a boolean primary key fixed to true: a PRIMARY KEY forbids more
-- than one row with the same value, and the CHECK below forbids that
-- value from ever being anything but true — between them, the table
-- can hold at most one row, ever.
create table public.app_settings (
  id boolean primary key default true,
  calendar_edit_permission public.calendar_edit_permission not null default 'members_own',
  long_absence_statuses text[] not null default array['sick_leave', 'parental_leave'],
  long_absence_min_days integer not null default 5,
  timezone text not null default 'Europe/Oslo',
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id),
  constraint app_settings_long_absence_min_days_positive check (long_absence_min_days > 0)
);

create table public.settings_events (
  id uuid primary key default gen_random_uuid(),
  changed_by uuid references public.profiles (id),
  changes jsonb not null,
  occurred_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;
alter table public.settings_events enable row level security;

-- Only select+update are granted, on top of RLS restricting update to
-- admins — insert/delete aren't needed by any legitimate path (the
-- singleton row is seeded once below) and are deliberately withheld so
-- there's no way, RLS bug or not, to end up with zero or two rows.
grant select, update on public.app_settings to authenticated, service_role;
grant select, insert on public.settings_events to authenticated, service_role;

create policy app_settings_select on public.app_settings
  for select to authenticated using (true);

create policy app_settings_update on public.app_settings
  for update to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

-- settings_events is append-only, admin-only (mirrors task_events'
-- append-only shape, but scoped to admins since only the Settings page,
-- itself admin-only, ever shows it).
create policy settings_events_select on public.settings_events
  for select to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'));

create policy settings_events_insert on public.settings_events
  for insert to authenticated
  with check (public.current_profile_role() in ('admin', 'master_admin'));

-- Stamp updated_by/updated_at from the session rather than trusting a
-- client-supplied actor — same reasoning as task_instances' status
-- stamp trigger.
create function public.stamp_app_settings_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_settings_stamp_update
  before update on public.app_settings
  for each row
  execute function public.stamp_app_settings_update();

create function public.log_settings_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  changes jsonb := '{}'::jsonb;
begin
  if new.calendar_edit_permission is distinct from old.calendar_edit_permission then
    changes := changes || jsonb_build_object(
      'calendar_edit_permission',
      jsonb_build_object('from', old.calendar_edit_permission, 'to', new.calendar_edit_permission)
    );
  end if;
  if new.long_absence_statuses is distinct from old.long_absence_statuses then
    changes := changes || jsonb_build_object(
      'long_absence_statuses',
      jsonb_build_object('from', to_jsonb(old.long_absence_statuses), 'to', to_jsonb(new.long_absence_statuses))
    );
  end if;
  if new.long_absence_min_days is distinct from old.long_absence_min_days then
    changes := changes || jsonb_build_object(
      'long_absence_min_days',
      jsonb_build_object('from', old.long_absence_min_days, 'to', new.long_absence_min_days)
    );
  end if;
  if new.timezone is distinct from old.timezone then
    changes := changes || jsonb_build_object(
      'timezone',
      jsonb_build_object('from', old.timezone, 'to', new.timezone)
    );
  end if;

  if changes <> '{}'::jsonb then
    insert into public.settings_events (changed_by, changes)
    values (new.updated_by, changes);
  end if;

  return new;
end;
$$;

create trigger app_settings_log_change
  after update on public.app_settings
  for each row
  execute function public.log_settings_change();

insert into public.app_settings (id) values (true);
