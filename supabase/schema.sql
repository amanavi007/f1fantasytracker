-- F1 Fantasy Punishment League Tracker schema
-- Deterministic punishment logic is computed in app code from gp_team_scores.

create extension if not exists "pgcrypto";

create type gp_status as enum ('draft', 'under_review', 'finalized');
create type submission_status as enum (
  'both_detected',
  'one_team_missing',
  'needs_review',
  'manually_corrected',
  'finalized',
  'missing_submission'
);
create type tie_rule as enum ('shared_last', 'lower_best_team_loses', 'manual_decision');

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  real_name text,
  avatar_url text,
  join_gp_id uuid,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists player_aliases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  alias text not null,
  unique(player_id, alias),
  unique(alias)
);

create table if not exists fantasy_teams (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),
  team_name text not null,
  is_active boolean not null default true,
  unique(player_id, slot)
);

create table if not exists gps (
  id uuid primary key default gen_random_uuid(),
  round_no integer,
  gp_name text not null,
  race_date date,
  status gp_status not null default 'draft',
  finalized_at timestamptz,
  finalized_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table players
  add constraint fk_players_join_gp
  foreign key (join_gp_id) references gps(id) on delete set null;

create table if not exists screenshot_uploads (
  id uuid primary key default gen_random_uuid(),
  gp_id uuid not null references gps(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  file_hash text,
  screenshot_category text,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  unique(gp_id, storage_path)
);

create table if not exists parsed_screenshot_results (
  id uuid primary key default gen_random_uuid(),
  screenshot_id uuid not null references screenshot_uploads(id) on delete cascade,
  parser_name text not null default 'vision-v1',
  gp_name text,
  detected_account_name text,
  detected_team_names jsonb not null default '[]'::jsonb,
  detected_scores jsonb not null default '[]'::jsonb,
  screenshot_type text,
  parsed_entities jsonb not null default '{}'::jsonb,
  confidence_by_field jsonb not null default '{}'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gp_entries (
  id uuid primary key default gen_random_uuid(),
  gp_id uuid not null references gps(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  submission_status submission_status not null default 'missing_submission',
  mapped_alias text,
  notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  unique(gp_id, player_id)
);

create table if not exists gp_team_scores (
  id uuid primary key default gen_random_uuid(),
  gp_id uuid not null references gps(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  team_slot smallint not null check (team_slot in (1, 2)),
  team_name text,
  score numeric(8,2),
  source_screenshot_id uuid references screenshot_uploads(id) on delete set null,
  source_parsed_result_id uuid references parsed_screenshot_results(id) on delete set null,
  is_manual_override boolean not null default false,
  unique(gp_id, player_id, team_slot)
);

create table if not exists correction_logs (
  id uuid primary key default gen_random_uuid(),
  gp_id uuid not null references gps(id) on delete cascade,
  screenshot_id uuid references screenshot_uploads(id) on delete set null,
  target_table text not null,
  target_row_id uuid,
  field_name text not null,
  original_value text,
  corrected_value text,
  edited_by text not null,
  reason text,
  edited_at timestamptz not null default now()
);

create table if not exists punishment_results (
  id uuid primary key default gen_random_uuid(),
  gp_id uuid not null references gps(id) on delete cascade unique,
  loser_player_ids uuid[] not null default '{}',
  second_last_player_ids uuid[] not null default '{}',
  tie_rule tie_rule not null,
  requires_manual_decision boolean not null default false,
  finalized_snapshot jsonb not null default '{}'::jsonb,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists gp_snapshot_history (
  id uuid primary key default gen_random_uuid(),
  gp_id uuid not null references gps(id) on delete cascade,
  snapshot_version integer not null,
  snapshot_data jsonb not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique(gp_id, snapshot_version)
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  league_name text not null default 'Private F1 Punishment League',
  tie_rule tie_rule not null default 'lower_best_team_loses',
  allow_unlock_finalized_gp boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_gp_team_scores_gp on gp_team_scores(gp_id);
create index if not exists idx_gp_entries_gp on gp_entries(gp_id);
create index if not exists idx_screenshot_uploads_gp on screenshot_uploads(gp_id);
create index if not exists idx_parsed_results_shot on parsed_screenshot_results(screenshot_id);
create index if not exists idx_correction_logs_gp on correction_logs(gp_id);
