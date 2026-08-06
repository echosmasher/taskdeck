-- task_events, settings_events, and reassignment_requests are all
-- deliberately append-only — no delete grant for anyone, including
-- service_role (see their migrations for why: audit history should
-- only ever be alterable by a genuine Postgres superuser connection).
-- The demo seed script (task 21) needs to wipe *all* demo-owned tables
-- on every run for real idempotency, which collides with that on
-- purpose. Rather than loosen the grants — which would remove a real
-- integrity guarantee from every table, not just the demo's — this adds
-- one narrowly-scoped function whose entire purpose is the reset.
--
-- security definer means it runs with the function owner's privileges
-- (the migration-applying role, effectively superuser), not the
-- caller's — that's what lets it bypass the grants below without
-- changing them. It's granted to service_role only, never
-- `authenticated`, so no admin session gains a new way to delete
-- audit history; only a trusted service-role context (the seed
-- script, and later the nightly reset job) can ever call it.
create function public.reset_demo_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- "where true" throughout: this project's local Postgres setup
  -- rejects unqualified DELETE/UPDATE statements outright (error 21000,
  -- "DELETE requires a WHERE clause"), so an always-true condition is
  -- required to express "every row" rather than being optional style.
  delete from public.task_events where true;
  delete from public.reassignment_requests where true;
  delete from public.task_instances where true;
  delete from public.calendar_entries where true;
  delete from public.settings_events where true;
  delete from public.tasks where true;
  delete from public.company_dimension_values where true;
  delete from public.companies where true;
  delete from public.dimension_values where true;
  delete from public.dimensions where true;
  update public.profiles set team_id = null where team_id is not null;
  delete from public.teams where true;
end;
$$;

grant execute on function public.reset_demo_data() to service_role;
