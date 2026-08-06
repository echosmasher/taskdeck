-- Companies and dimensions. Country/Brand are seeded dimensions, not
-- company columns, so every dimension (including custom ones admins add
-- later) behaves identically. See taskdeck-spec.md §4 and §14.

create table public.dimensions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table public.dimension_values (
  id uuid primary key default gen_random_uuid(),
  dimension_id uuid not null references public.dimensions (id) on delete cascade,
  value text not null,
  created_at timestamptz not null default now(),
  unique (dimension_id, value)
);

-- "Every dimension is required when creating a company" (§14) is a
-- dynamic rule (the set of dimensions changes as admins add more) and is
-- enforced as form validation on the Companies admin page (task 6), not
-- as a DB constraint here.
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- "One value per company per dimension" (§4). dimension_id is a
-- denormalized copy of dimension_values.dimension_id, kept in sync by the
-- trigger below, purely so a plain UNIQUE(company_id, dimension_id) index
-- can enforce the one-per-dimension rule without a recursive subquery
-- constraint. Clients only ever need to supply company_id +
-- dimension_value_id.
create table public.company_dimension_values (
  company_id uuid not null references public.companies (id) on delete cascade,
  dimension_value_id uuid not null references public.dimension_values (id) on delete cascade,
  dimension_id uuid not null references public.dimensions (id) on delete cascade,
  primary key (company_id, dimension_value_id),
  unique (company_id, dimension_id)
);

create function public.set_company_dimension_value_dimension_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select dimension_id into new.dimension_id
  from public.dimension_values
  where id = new.dimension_value_id;

  if new.dimension_id is null then
    raise exception 'dimension_value_id % does not exist', new.dimension_value_id;
  end if;

  return new;
end;
$$;

create trigger set_company_dimension_value_dimension_id_trigger
  before insert or update of dimension_value_id on public.company_dimension_values
  for each row
  execute function public.set_company_dimension_value_dimension_id();

-- Seeded defaults (§4 — "Country and Brand are seeded by default; admins
-- can add more").
insert into public.dimensions (name) values ('Country'), ('Brand');

alter table public.dimensions enable row level security;
alter table public.dimension_values enable row level security;
alter table public.companies enable row level security;
alter table public.company_dimension_values enable row level security;

grant select, insert, update, delete on public.dimensions to authenticated, service_role;
grant select, insert, update, delete on public.dimension_values to authenticated, service_role;
grant select, insert, update, delete on public.companies to authenticated, service_role;
grant select, insert, update, delete on public.company_dimension_values to authenticated, service_role;

-- Everyone reads (scope chips, filters, company pickers); only
-- admin/master_admin write. Companies' hard-delete "zero task history"
-- rule (§4) is layered in once task_instances exists (task 10 migration),
-- same deferral as teams/profiles.
create policy dimensions_select on public.dimensions
  for select to authenticated using (true);
create policy dimensions_write on public.dimensions
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

create policy dimension_values_select on public.dimension_values
  for select to authenticated using (true);
create policy dimension_values_write on public.dimension_values
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

create policy companies_select on public.companies
  for select to authenticated using (true);
create policy companies_write on public.companies
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

create policy company_dimension_values_select on public.company_dimension_values
  for select to authenticated using (true);
create policy company_dimension_values_write on public.company_dimension_values
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));
