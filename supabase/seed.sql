insert into app_settings (league_name, tie_rule, allow_unlock_finalized_gp)
values ('Private F1 Punishment League', 'lower_best_team_loses', true)
on conflict do nothing;

with calendar(round_no, gp_name, race_date) as (
	values
		(1, 'Australian Grand Prix', date '2026-03-08'),
		(2, 'Chinese Grand Prix', date '2026-03-15'),
		(3, 'Japanese Grand Prix', date '2026-03-29'),
		(4, 'Bahrain Grand Prix', date '2026-04-12'),
		(5, 'Saudi Arabian Grand Prix', date '2026-04-19'),
		(6, 'Miami Grand Prix', date '2026-05-03'),
		(7, 'Canadian Grand Prix', date '2026-05-24'),
		(8, 'Monaco Grand Prix', date '2026-06-07'),
		(9, 'Barcelona-Catalunya GP', date '2026-06-14'),
		(10, 'Austrian Grand Prix', date '2026-06-28'),
		(11, 'British Grand Prix', date '2026-07-05'),
		(12, 'Belgian Grand Prix', date '2026-07-19'),
		(13, 'Hungarian Grand Prix', date '2026-07-26'),
		(14, 'Dutch Grand Prix', date '2026-08-23'),
		(15, 'Italian Grand Prix', date '2026-09-06'),
		(16, 'Spanish Grand Prix', date '2026-09-13'),
		(17, 'Azerbaijan Grand Prix', date '2026-09-26'),
		(18, 'Singapore Grand Prix', date '2026-10-11'),
		(19, 'United States Grand Prix', date '2026-10-25'),
		(20, 'Mexico City Grand Prix', date '2026-11-01'),
		(21, 'São Paulo Grand Prix', date '2026-11-08'),
		(22, 'Las Vegas Grand Prix', date '2026-11-21'),
		(23, 'Qatar Grand Prix', date '2026-11-29'),
		(24, 'Abu Dhabi Grand Prix', date '2026-12-06')
)
update gps g
set
	gp_name = c.gp_name,
	race_date = c.race_date,
	updated_at = now()
from calendar c
where g.round_no = c.round_no;

with calendar(round_no, gp_name, race_date) as (
	values
		(1, 'Australian Grand Prix', date '2026-03-08'),
		(2, 'Chinese Grand Prix', date '2026-03-15'),
		(3, 'Japanese Grand Prix', date '2026-03-29'),
		(4, 'Bahrain Grand Prix', date '2026-04-12'),
		(5, 'Saudi Arabian Grand Prix', date '2026-04-19'),
		(6, 'Miami Grand Prix', date '2026-05-03'),
		(7, 'Canadian Grand Prix', date '2026-05-24'),
		(8, 'Monaco Grand Prix', date '2026-06-07'),
		(9, 'Barcelona-Catalunya GP', date '2026-06-14'),
		(10, 'Austrian Grand Prix', date '2026-06-28'),
		(11, 'British Grand Prix', date '2026-07-05'),
		(12, 'Belgian Grand Prix', date '2026-07-19'),
		(13, 'Hungarian Grand Prix', date '2026-07-26'),
		(14, 'Dutch Grand Prix', date '2026-08-23'),
		(15, 'Italian Grand Prix', date '2026-09-06'),
		(16, 'Spanish Grand Prix', date '2026-09-13'),
		(17, 'Azerbaijan Grand Prix', date '2026-09-26'),
		(18, 'Singapore Grand Prix', date '2026-10-11'),
		(19, 'United States Grand Prix', date '2026-10-25'),
		(20, 'Mexico City Grand Prix', date '2026-11-01'),
		(21, 'São Paulo Grand Prix', date '2026-11-08'),
		(22, 'Las Vegas Grand Prix', date '2026-11-21'),
		(23, 'Qatar Grand Prix', date '2026-11-29'),
		(24, 'Abu Dhabi Grand Prix', date '2026-12-06')
)
insert into gps (round_no, gp_name, race_date, status)
select c.round_no, c.gp_name, c.race_date, 'draft'::gp_status
from calendar c
where not exists (
	select 1
	from gps g
	where g.round_no = c.round_no
);

-- Add seed data through scripts/seed.ts if using Supabase JS.
