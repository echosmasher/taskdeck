-- Instance-level assignee overrides (addendum §15.3.3): absence never
-- blocks assignment, so coverage is modelled as a per-instance
-- override rather than a validation rule on the task definition.

alter type public.task_event_type add value 'override_set';
alter type public.task_event_type add value 'override_cleared';

alter table public.task_instances add column assignee_override_profile_id uuid references public.profiles (id);
alter table public.task_instances add column override_reason text;
alter table public.task_instances add column override_set_by uuid references public.profiles (id);
alter table public.task_instances add column override_set_at timestamptz;

create index task_instances_assignee_override_profile_id_idx
  on public.task_instances (assignee_override_profile_id);

-- Overrides are admin-only tooling (coverage view, reassignment
-- approval — tasks 20e-20g), even though can_manage_task_instance
-- already lets an assigned member update their own instance's status.
-- A trigger enforces that distinction (RLS alone can't easily compare
-- old vs new per-column), and stamps the actor/timestamp the same way
-- every other status change is stamped — never trust a client-supplied
-- actor.
create function public.guard_task_instance_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_override_profile_id is distinct from old.assignee_override_profile_id
    or new.override_reason is distinct from old.override_reason then
    if public.current_profile_role() not in ('admin', 'master_admin') then
      raise exception 'Only admins can set or clear an instance assignee override.';
    end if;
    new.override_set_by := auth.uid();
    new.override_set_at := now();
  end if;
  return new;
end;
$$;

create trigger task_instances_guard_override
  before update on public.task_instances
  for each row
  execute function public.guard_task_instance_override();

create function public.log_task_instance_override_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_override_profile_id is distinct from old.assignee_override_profile_id then
    if new.assignee_override_profile_id is not null then
      insert into public.task_events (task_id, task_instance_id, event, actor_profile_id, details)
      values (
        new.task_id,
        new.id,
        'override_set',
        new.override_set_by,
        jsonb_build_object(
          'assignee_override_profile_id', new.assignee_override_profile_id,
          'previous_assignee_override_profile_id', old.assignee_override_profile_id,
          'override_reason', new.override_reason
        )
      );
    else
      insert into public.task_events (task_id, task_instance_id, event, actor_profile_id, details)
      values (
        new.task_id,
        new.id,
        'override_cleared',
        new.override_set_by,
        jsonb_build_object('previous_assignee_override_profile_id', old.assignee_override_profile_id)
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger task_instances_log_override_change
  after update on public.task_instances
  for each row
  execute function public.log_task_instance_override_change();

-- can_manage_task_instance only ever checked the task's raw assignee,
-- so a covering member (assignee_override_profile_id = them) couldn't
-- actually complete the instance they're covering — the whole feature
-- is pointless without this. Redefined (not just replaced in place)
-- because the signature is changing: the policy needs to pass the
-- row's override column in, and CREATE OR REPLACE can't change a
-- function's argument list.
drop policy task_instances_update on public.task_instances;
drop function public.can_manage_task_instance(uuid);

create function public.can_manage_task_instance(p_task_id uuid, p_override_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() in ('admin', 'master_admin')
    or p_override_profile_id = auth.uid()
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

create policy task_instances_update on public.task_instances
  for update to authenticated
  using (public.can_manage_task_instance(task_id, assignee_override_profile_id))
  with check (public.can_manage_task_instance(task_id, assignee_override_profile_id));
