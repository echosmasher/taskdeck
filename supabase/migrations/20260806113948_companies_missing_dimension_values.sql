-- One row per (active company, dimension) pair missing a value. Powers
-- the persistent "incomplete data" warning on the Companies page and the
-- guided backfill flow triggered when a new dimension is added (§7.4).
-- No security_definer — runs with the querying user's rights, so it's
-- naturally visible to anyone who can already read companies/dimensions
-- (both "everyone reads" per existing RLS policies).
create view public.companies_missing_dimension_values as
select
  c.id as company_id,
  c.name as company_name,
  d.id as dimension_id,
  d.name as dimension_name
from public.companies c
cross join public.dimensions d
left join public.company_dimension_values cdv
  on cdv.company_id = c.id and cdv.dimension_id = d.id
where c.is_archived = false
  and cdv.company_id is null;

grant select on public.companies_missing_dimension_values to authenticated, service_role;
