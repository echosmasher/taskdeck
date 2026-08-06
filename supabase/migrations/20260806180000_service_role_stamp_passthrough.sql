-- Every stamp trigger so far unconditionally forces actor/timestamp
-- columns to auth.uid()/now(), which is correct for real user sessions
-- (untamperable) but means a service-role caller — the only role that
-- can ever have auth.uid() = null under these policies — can't supply
-- a historical actor or timestamp at all. That blocks anything that
-- needs to write *realistic* backdated audit history as a trusted
-- system operation: the demo seed script (task 21) most immediately,
-- but the same need would show up for a future bulk import too.
--
-- Fix, applied identically everywhere this pattern exists: when
-- auth.uid() is present (a real authenticated session), keep forcing
-- it and now() exactly as before — nothing changes for normal usage.
-- When auth.uid() is null (service-role), leave the caller-supplied
-- values on NEW untouched instead of overwriting them, so a trusted
-- system caller can backdate history explicitly. Service-role already
-- bypasses RLS entirely, so this isn't a new privilege — it's
-- formalizing one a service-role caller already effectively has.

create or replace function public.stamp_task_instance_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and auth.uid() is not null then
    new.status_set_by := auth.uid();
    new.status_set_at := now();
  end if;
  return new;
end;
$$;

-- occurred_at now explicitly follows new.status_set_at (previously
-- relied on the column default of now()) so a backdated status change
-- produces a backdated event too, not one dated "whenever the seed
-- script happened to run."
create or replace function public.log_task_instance_status_change()
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

    insert into public.task_events (task_id, task_instance_id, event, actor_profile_id, occurred_at, details)
    values (
      new.task_id,
      new.id,
      v_event,
      new.status_set_by,
      coalesce(new.status_set_at, now()),
      case when v_event = 'marked_na' and new.na_reason is not null
        then jsonb_build_object('na_reason', new.na_reason)
        else '{}'::jsonb
      end
    );
  end if;
  return new;
end;
$$;

create or replace function public.guard_task_instance_override()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_override_profile_id is distinct from old.assignee_override_profile_id
    or new.override_reason is distinct from old.override_reason then
    if auth.uid() is not null then
      if public.current_profile_role() not in ('admin', 'master_admin') then
        raise exception 'Only admins can set or clear an instance assignee override.';
      end if;
      new.override_set_by := auth.uid();
      new.override_set_at := now();
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.log_task_instance_override_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assignee_override_profile_id is distinct from old.assignee_override_profile_id then
    if new.assignee_override_profile_id is not null then
      insert into public.task_events (task_id, task_instance_id, event, actor_profile_id, occurred_at, details)
      values (
        new.task_id,
        new.id,
        'override_set',
        new.override_set_by,
        coalesce(new.override_set_at, now()),
        jsonb_build_object(
          'assignee_override_profile_id', new.assignee_override_profile_id,
          'previous_assignee_override_profile_id', old.assignee_override_profile_id,
          'override_reason', new.override_reason
        )
      );
    else
      insert into public.task_events (task_id, task_instance_id, event, actor_profile_id, occurred_at, details)
      values (
        new.task_id,
        new.id,
        'override_cleared',
        new.override_set_by,
        coalesce(new.override_set_at, now()),
        jsonb_build_object('previous_assignee_override_profile_id', old.assignee_override_profile_id)
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.stamp_calendar_entry_set()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.set_by_profile_id := auth.uid();
    new.set_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.stamp_app_settings_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.guard_reassignment_request_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_profile_role() not in ('admin', 'master_admin') then
    if new.status is distinct from 'withdrawn'
      or old.status is distinct from 'pending'
      or new.requested_by_profile_id is distinct from old.requested_by_profile_id
      or new.scope is distinct from old.scope
      or new.task_id is distinct from old.task_id
      or new.task_instance_ids is distinct from old.task_instance_ids
      or new.reason is distinct from old.reason
      or new.suggested_assignee_profile_id is distinct from old.suggested_assignee_profile_id
    then
      raise exception 'Members may only withdraw their own pending request.';
    end if;
  elsif new.status in ('approved', 'rejected') and old.status = 'pending' and auth.uid() is not null then
    new.decided_by_profile_id := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;
