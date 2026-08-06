-- Public holidays, used by the working-day recurrence calculation
-- (§6). Seeded for NO/SE/DK, current year and next (2026-2027) per §4.
-- unique(country_code, date) because a fixed-date holiday and a movable
-- one can genuinely land on the same day (see NO 2027-05-17 below) —
-- one row per calendar day per country, not per named holiday.
create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  name text not null,
  country_code text not null,
  unique (country_code, date)
);

alter table public.holidays enable row level security;

grant select, insert, update, delete on public.holidays to authenticated, service_role;

create policy holidays_select on public.holidays
  for select to authenticated
  using (true);

create policy holidays_write on public.holidays
  for all to authenticated
  using (public.current_profile_role() in ('admin', 'master_admin'))
  with check (public.current_profile_role() in ('admin', 'master_admin'));

insert into public.holidays (date, name, country_code) values
  -- Norway 2026
  ('2026-01-01', 'New Year''s Day', 'NO'),
  ('2026-04-02', 'Maundy Thursday', 'NO'),
  ('2026-04-03', 'Good Friday', 'NO'),
  ('2026-04-05', 'Easter Sunday', 'NO'),
  ('2026-04-06', 'Easter Monday', 'NO'),
  ('2026-05-01', 'Labour Day', 'NO'),
  ('2026-05-14', 'Ascension Day', 'NO'),
  ('2026-05-17', 'Constitution Day', 'NO'),
  ('2026-05-24', 'Whit Sunday', 'NO'),
  ('2026-05-25', 'Whit Monday', 'NO'),
  ('2026-12-25', 'Christmas Day', 'NO'),
  ('2026-12-26', 'Boxing Day', 'NO'),
  -- Norway 2027 (Constitution Day and Whit Monday coincide this year)
  ('2027-01-01', 'New Year''s Day', 'NO'),
  ('2027-03-25', 'Maundy Thursday', 'NO'),
  ('2027-03-26', 'Good Friday', 'NO'),
  ('2027-03-28', 'Easter Sunday', 'NO'),
  ('2027-03-29', 'Easter Monday', 'NO'),
  ('2027-05-01', 'Labour Day', 'NO'),
  ('2027-05-06', 'Ascension Day', 'NO'),
  ('2027-05-16', 'Whit Sunday', 'NO'),
  ('2027-05-17', 'Constitution Day / Whit Monday', 'NO'),
  ('2027-12-25', 'Christmas Day', 'NO'),
  ('2027-12-26', 'Boxing Day', 'NO'),
  -- Sweden 2026
  ('2026-01-01', 'New Year''s Day', 'SE'),
  ('2026-01-06', 'Epiphany', 'SE'),
  ('2026-04-03', 'Good Friday', 'SE'),
  ('2026-04-05', 'Easter Sunday', 'SE'),
  ('2026-04-06', 'Easter Monday', 'SE'),
  ('2026-05-01', 'Labour Day', 'SE'),
  ('2026-05-14', 'Ascension Day', 'SE'),
  ('2026-06-06', 'National Day', 'SE'),
  ('2026-06-20', 'Midsummer Day', 'SE'),
  ('2026-10-31', 'All Saints'' Day', 'SE'),
  ('2026-12-25', 'Christmas Day', 'SE'),
  ('2026-12-26', 'Boxing Day', 'SE'),
  -- Sweden 2027
  ('2027-01-01', 'New Year''s Day', 'SE'),
  ('2027-01-06', 'Epiphany', 'SE'),
  ('2027-03-26', 'Good Friday', 'SE'),
  ('2027-03-28', 'Easter Sunday', 'SE'),
  ('2027-03-29', 'Easter Monday', 'SE'),
  ('2027-05-01', 'Labour Day', 'SE'),
  ('2027-05-06', 'Ascension Day', 'SE'),
  ('2027-06-06', 'National Day', 'SE'),
  ('2027-06-26', 'Midsummer Day', 'SE'),
  ('2027-11-06', 'All Saints'' Day', 'SE'),
  ('2027-12-25', 'Christmas Day', 'SE'),
  ('2027-12-26', 'Boxing Day', 'SE'),
  -- Denmark 2026
  ('2026-01-01', 'New Year''s Day', 'DK'),
  ('2026-04-02', 'Maundy Thursday', 'DK'),
  ('2026-04-03', 'Good Friday', 'DK'),
  ('2026-04-05', 'Easter Sunday', 'DK'),
  ('2026-04-06', 'Easter Monday', 'DK'),
  ('2026-05-14', 'Ascension Day', 'DK'),
  ('2026-05-24', 'Whit Sunday', 'DK'),
  ('2026-05-25', 'Whit Monday', 'DK'),
  ('2026-12-25', 'Christmas Day', 'DK'),
  ('2026-12-26', 'Boxing Day', 'DK'),
  -- Denmark 2027
  ('2027-01-01', 'New Year''s Day', 'DK'),
  ('2027-03-25', 'Maundy Thursday', 'DK'),
  ('2027-03-26', 'Good Friday', 'DK'),
  ('2027-03-28', 'Easter Sunday', 'DK'),
  ('2027-03-29', 'Easter Monday', 'DK'),
  ('2027-05-06', 'Ascension Day', 'DK'),
  ('2027-05-16', 'Whit Sunday', 'DK'),
  ('2027-05-17', 'Whit Monday', 'DK'),
  ('2027-12-25', 'Christmas Day', 'DK'),
  ('2027-12-26', 'Boxing Day', 'DK');
