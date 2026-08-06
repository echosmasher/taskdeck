-- Office calendar: one status per member per day (§4, §7.6).

create type public.calendar_entry_status as enum (
  'in_office',
  'remote',
  'out_of_office',
  'sick',
  'sick_leave',
  'parental_leave',
  'business_travel'
);

create table public.calendar_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id),
  date date not null,
  status public.calendar_entry_status not null,
  unique (profile_id, date)
);

create index calendar_entries_date_idx on public.calendar_entries (date);
create index calendar_entries_profile_id_idx on public.calendar_entries (profile_id);

alter table public.calendar_entries enable row level security;

grant select, insert, update, delete on public.calendar_entries to authenticated, service_role;

-- view: all; edit: admin (§7.6) — same shape as holidays_select/_write.
create policy calendar_entries_select on public.calendar_entries
  for select to authenticated using (true);

create policy calendar_entries_write on public.calendar_entries
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));
