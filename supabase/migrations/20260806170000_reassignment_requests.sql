-- Member-initiated reassignment requests (addendum §15.4). Members can
-- never reassign a task directly — they can only ask; only admins can
-- execute the request (approve/reject is task 20g).

create type public.reassignment_request_scope as enum ('instance', 'task');
create type public.reassignment_request_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

create table public.reassignment_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by_profile_id uuid not null references public.profiles (id),
  scope public.reassignment_request_scope not null,
  task_id uuid not null references public.tasks (id),
  -- Only meaningful for scope = 'instance': may cover several company
  -- instances of the same occurrence (§15.4 — "may cover several
  -- companies of the same occurrence"). Empty for scope = 'task'.
  task_instance_ids uuid[] not null default '{}',
  reason text not null,
  suggested_assignee_profile_id uuid references public.profiles (id),
  status public.reassignment_request_status not null default 'pending',
  decided_by_profile_id uuid references public.profiles (id),
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  constraint reassignment_requests_reason_not_blank check (btrim(reason) <> ''),
  constraint reassignment_requests_scope_instances check (
    (scope = 'instance' and array_length(task_instance_ids, 1) > 0)
    or (scope = 'task' and task_instance_ids = '{}')
  )
);

create index reassignment_requests_task_id_idx on public.reassignment_requests (task_id);
create index reassignment_requests_requested_by_idx on public.reassignment_requests (requested_by_profile_id);
create index reassignment_requests_status_idx on public.reassignment_requests (status);

alter table public.reassignment_requests enable row level security;

-- No delete grant: a request's lifecycle only ever moves forward
-- (pending -> withdrawn/approved/rejected), so the table is its own
-- audit trail — nothing is ever removed from it.
grant select, insert, update on public.reassignment_requests to authenticated, service_role;

-- Members see only their own requests; admins see everything (needed
-- for the task 20g approval queue).
create policy reassignment_requests_select on public.reassignment_requests
  for select to authenticated
  using (
    public.current_profile_role() in ('admin', 'master_admin')
    or requested_by_profile_id = auth.uid()
  );

-- A member can only ever create a pending request in their own name —
-- never pre-approved, never on someone else's behalf.
create policy reassignment_requests_insert on public.reassignment_requests
  for insert to authenticated
  with check (
    requested_by_profile_id = auth.uid()
    and status = 'pending'
  );

create function public.can_update_reassignment_request(
  p_current_status public.reassignment_request_status,
  p_requested_by uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() in ('admin', 'master_admin')
    or (p_requested_by = auth.uid() and p_current_status = 'pending');
$$;

create policy reassignment_requests_update on public.reassignment_requests
  for update to authenticated
  using (public.can_update_reassignment_request(status, requested_by_profile_id))
  with check (true); -- field-level restrictions enforced by the trigger below

-- USING already restricts *which rows* a member can touch (their own,
-- still pending); this restricts *what* they can change on that row —
-- withdrawal only, nothing else — since RLS can't express "these
-- columns may only take this one new value" on its own. Also stamps
-- decided_by/decided_at for an admin's decision, same reasoning as
-- every other actor stamp in this schema: never trust a client-
-- supplied actor.
create function public.guard_reassignment_request_update()
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
  elsif new.status in ('approved', 'rejected') and old.status = 'pending' then
    new.decided_by_profile_id := auth.uid();
    new.decided_at := now();
  end if;
  return new;
end;
$$;

create trigger reassignment_requests_guard_update
  before update on public.reassignment_requests
  for each row
  execute function public.guard_reassignment_request_update();
