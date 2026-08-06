-- Task definitions, per-company instances, and the append-only audit
-- log. See taskdeck-spec.md §4, §5, §6, §14.

create type public.task_assignee_type as enum ('team', 'person');
create type public.task_instance_status as enum ('open', 'completed', 'na');
create type public.task_event_type as enum (
  'created', 'completed', 'marked_na', 'reopened', 'reassigned', 'edited'
);

-- recurrence and deadline_rule are jsonb (see §6/§14 for the shapes):
--   recurrence: {type:'one_off', date} | {type:'weekly', weekday: 0-6}
--     | {type:'monthly_fixed', dayOfMonth: 1-31}
--     | {type:'monthly_nth_working_day', n: nonzero int, countryCode}
--   deadline_rule (nullable): {offsetDays: signed int, offsetType:
--     'calendar'|'working', countryCode?} — null means the due date IS
--     the recurrence occurrence date, which is the common case (§14).
-- Full shape validation lives in the admin form (task 11); the CHECK
-- below only guards the discriminant so a malformed row can't silently
-- lack a recognizable type.
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee_type public.task_assignee_type not null,
  assignee_team_id uuid references public.teams (id),
  assignee_profile_id uuid references public.profiles (id),
  scope jsonb not null default '[]'::jsonb,
  recurrence jsonb not null,
  deadline_rule jsonb,
  is_archived boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint tasks_assignee_exactly_one check (
    (assignee_type = 'team' and assignee_team_id is not null and assignee_profile_id is null)
    or
    (assignee_type = 'person' and assignee_profile_id is not null and assignee_team_id is null)
  ),
  constraint tasks_recurrence_type check (
    recurrence ->> 'type' in ('one_off', 'weekly', 'monthly_fixed', 'monthly_nth_working_day')
  )
);

create index tasks_assignee_team_id_idx on public.tasks (assignee_team_id);
create index tasks_assignee_profile_id_idx on public.tasks (assignee_profile_id);

create table public.task_instances (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  company_id uuid not null references public.companies (id),
  due_date date not null,
  status public.task_instance_status not null default 'open',
  status_set_by uuid references public.profiles (id),
  status_set_at timestamptz,
  na_reason text,
  unique (task_id, company_id, due_date)
);

create index task_instances_task_id_idx on public.task_instances (task_id);
create index task_instances_company_id_idx on public.task_instances (company_id);
create index task_instances_due_date_idx on public.task_instances (due_date);
create index task_instances_status_idx on public.task_instances (status);

-- task_instance_id is nullable so this table can also carry task-level
-- events (reassigned, edited) that aren't about any one instance — §5
-- says reassignment "is logged in task_events" but §4's schema only
-- lists an instance_id, which can't represent a task-wide reassignment.
-- task_id is always set (denormalized onto instance-level events too)
-- so every row is queryable by task regardless of event kind.
-- actor_profile_id is nullable only for system-generated 'created'
-- events fired by instance generation (task 13), which has no human
-- actor.
create table public.task_events (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id),
  task_instance_id uuid references public.task_instances (id),
  event public.task_event_type not null,
  actor_profile_id uuid references public.profiles (id),
  occurred_at timestamptz not null default now(),
  details jsonb not null default '{}'::jsonb
);

create index task_events_task_id_idx on public.task_events (task_id);
create index task_events_task_instance_id_idx on public.task_events (task_instance_id);

alter table public.tasks enable row level security;
alter table public.task_instances enable row level security;
alter table public.task_events enable row level security;

grant select, insert, update, delete on public.tasks to authenticated, service_role;
grant select, insert, update, delete on public.task_instances to authenticated, service_role;
-- task_events is append-only: no update/delete grant for authenticated,
-- not even for admins. service_role also gets no update/delete — the
-- only legitimate way to alter history is a raw superuser connection
-- (e.g. the demo reset job wiping the whole table), which bypasses
-- table grants entirely.
grant select, insert on public.task_events to authenticated, service_role;

create function public.can_manage_task_instance(p_task_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() in ('admin', 'master_admin')
    or exists (
      select 1 from public.tasks t
      where t.id = p_task_id
        and (
          (t.assignee_type = 'person' and t.assignee_profile_id = auth.uid())
          or (t.assignee_type = 'team' and t.assignee_team_id = (
            select team_id from public.profiles where id = auth.uid()
          ))
        )
    );
$$;

-- tasks: everyone reads (dashboard needs titles/chips for all-tasks
-- view and team-task display); only admin/master_admin write.
create policy tasks_select on public.tasks
  for select to authenticated using (true);
create policy tasks_write on public.tasks
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

-- task_instances: everyone reads. Admin/master_admin can update any
-- instance; a member can only update instances whose task is assigned
-- to them directly or to their team (§3, §5) — see
-- can_manage_task_instance above. INSERT is intentionally NOT granted
-- to plain members: instance generation (task 13) must always run
-- through the service-role/admin client, regardless of what triggered
-- it (cron or a page load), so a member's session is never able to
-- bulk-create instances.
create policy task_instances_select on public.task_instances
  for select to authenticated using (true);
create policy task_instances_insert on public.task_instances
  for insert to authenticated
  with check (public.current_profile_role() in ('admin', 'master_admin'));
create policy task_instances_update on public.task_instances
  for update to authenticated
  using (public.can_manage_task_instance(task_id))
  with check (public.can_manage_task_instance(task_id));

-- task_events: everyone reads (History page is gated at the route
-- layer, task 4; nothing here is more sensitive than task_instances
-- already exposes). INSERT only — see the append-only grant above.
create policy task_events_select on public.task_events
  for select to authenticated using (true);
create policy task_events_insert on public.task_events
  for insert to authenticated with check (true);

-- Stamp status_set_by/status_set_at from the session automatically so
-- "every completion is stamped" (§1) can't be spoofed or forgotten by
-- a call site — never trust a client-supplied actor for this.
create function public.stamp_task_instance_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.status_set_by := auth.uid();
    new.status_set_at := now();
  end if;
  return new;
end;
$$;

create trigger task_instances_stamp_status_change
  before update on public.task_instances
  for each row
  execute function public.stamp_task_instance_status_change();

create function public.log_task_instance_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.task_events (task_id, task_instance_id, event, actor_profile_id)
  values (new.task_id, new.id, 'created', auth.uid());
  return new;
end;
$$;

create trigger task_instances_log_created
  after insert on public.task_instances
  for each row
  execute function public.log_task_instance_created();

create function public.log_task_instance_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.task_event_type;
begin
  if new.status is distinct from old.status then
    if new.status = 'completed' then
      v_event := 'completed';
    elsif new.status = 'na' then
      v_event := 'marked_na';
    else
      v_event := 'reopened';
    end if;

    insert into public.task_events (task_id, task_instance_id, event, actor_profile_id, details)
    values (
      new.task_id,
      new.id,
      v_event,
      new.status_set_by,
      case when v_event = 'marked_na' and new.na_reason is not null
        then jsonb_build_object('na_reason', new.na_reason)
        else '{}'::jsonb
      end
    );
  end if;
  return new;
end;
$$;

create trigger task_instances_log_status_change
  after update on public.task_instances
  for each row
  execute function public.log_task_instance_status_change();
