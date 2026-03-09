insert into app_settings (league_name, tie_rule, allow_unlock_finalized_gp)
values ('Private F1 Punishment League', 'lower_best_team_loses', true)
on conflict do nothing;

-- Add seed data through scripts/seed.ts if using Supabase JS.
