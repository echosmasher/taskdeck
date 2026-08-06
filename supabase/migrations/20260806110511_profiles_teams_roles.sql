-- Teams, profiles, roles, and the master-admin bootstrap.
-- See taskdeck-spec.md §3 (roles and access) and §12 (bootstrapping).

create type public.user_role as enum ('master_admin', 'admin', 'member');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  position text,
  team_id uuid references public.teams (id) on delete set null,
  role public.user_role not null default 'member',
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

create index profiles_team_id_idx on public.profiles (team_id);

alter table public.teams enable row level security;
alter table public.profiles enable row level security;

-- service_role also needs explicit grants under this project's Data API
-- config (auto_expose_new_tables is unset — see supabase/config.toml).
-- Server-only code (bootstrap, seed script, nightly reset) uses this role
-- and bypasses RLS, but still needs the underlying SQL privilege.
grant select, insert, update, delete on public.teams to authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;

-- SECURITY DEFINER so policies can read the caller's role without
-- recursing back into profiles' own RLS policies.
create function public.current_profile_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- teams: everyone can read (dashboard chips, calendar grouping); only
-- admins manage membership; hard delete restricted to master_admin (§4
-- "archiving, never deleting" — the history-zero check on delete is
-- layered in once tasks exist, see task 10 migration).
create policy teams_select on public.teams
  for select to authenticated
  using (true);

create policy teams_insert on public.teams
  for insert to authenticated
  with check (public.current_profile_role() in ('admin', 'master_admin'));

create policy teams_update on public.teams
  for update to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

create policy teams_delete on public.teams
  for delete to authenticated
  using (public.current_profile_role() = 'master_admin');

-- profiles: everyone can read (assignee names, "who completed" stamps,
-- calendar). No INSERT policy — rows are created only by the
-- handle_new_user trigger below, which runs as the (RLS-exempt) function
-- owner. Admins/master_admin can update; role changes are further gated
-- by the trigger below. Hard delete restricted to master_admin, same
-- zero-history deferral as teams.
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.current_profile_role() = 'master_admin');

-- Role-change guard: admins can never touch the role column; master_admin
-- can toggle member <-> admin (§3 "grant/revoke admin role"); master_admin
-- itself is only ever set once, by the bootstrap path below, never through
-- an ordinary UPDATE.
create function public.enforce_role_change_permissions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  master_admin_exists boolean;
begin
  if new.role is distinct from old.role then
    if new.role = 'master_admin' then
      select exists(select 1 from public.profiles where role = 'master_admin')
        into master_admin_exists;
      if master_admin_exists then
        raise exception 'master_admin is seeded once and cannot be reassigned';
      end if;
      -- else: allow — this is the one-time bootstrap promotion
    elsif public.current_profile_role() <> 'master_admin' then
      raise exception 'only master_admin can change a profile role';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_role_change_guard
  before update on public.profiles
  for each row
  execute function public.enforce_role_change_permissions();

-- Auto-create a profile row for every new auth user, defaulting to
-- 'member'. The SEED_MASTER_ADMIN_EMAIL first-login promotion to
-- master_admin happens in application code (env vars aren't reachable
-- from SQL), via a guarded UPDATE using the service-role client — the
-- trigger above is what allows that one-time promotion through.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
