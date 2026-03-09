# F1 Fantasy Punishment Tracker

Premium, dark, F1-inspired private league tracker built with Next.js + TypeScript + Tailwind + Supabase-ready schema.

## MVP Features

- GP-by-GP punishment logic with two-team combined scoring (`team1 + team2`)
- Deterministic punishment computation in app code
- GP status flow: draft -> under review -> finalized (lock semantics ready)
- Batch screenshot upload to Supabase storage with duplicate warning heuristics
- OpenAI vision parsing via `/api/parse-screenshot`
- AI parser review screen with confidence highlighting, manual correction, and approval save
- Alias mapping support for parsed account names to players
- GP detail with ranking, loser/second-last, submission statuses, gallery, correction log
- Dashboard, players, GP history, punishment board, and shame stats pages
- Supabase normalized schema and live data wiring

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Lightweight shadcn-style UI primitives
- Supabase JS client/server helpers
- Vision parsing pipeline ready via `/api/parse-screenshot` (mocked parser in MVP)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create env file:
```bash
cp .env.example .env.local
```

3. Run dev server:
```bash
npm run dev
```

4. Optional checks:
```bash
npm run typecheck
npm run lint
npm run build
```

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default `screenshots`)
- `ADMIN_EMAILS` comma-separated list of admin emails for Supabase JWT checks
- `ADMIN_API_KEY` optional server-side admin key accepted via `x-admin-api-key`
- `STRICT_ADMIN_AUTH` set `true` to require admin auth even if no admin config is present
- `VISION_API_BASE_URL`
- `VISION_API_KEY`
- `VISION_MODEL`

## Database

- Schema: `supabase/schema.sql`
- Seed starter: `supabase/seed.sql`
- Mock seed payload script: `scripts/seed.ts`

Run the SQL schema in your Supabase SQL editor, then wire API routes to real DB actions.

## Real Data Setup Checklist

1. Create a Supabase project and run `supabase/schema.sql`.
2. Create a storage bucket matching `SUPABASE_STORAGE_BUCKET` (default `screenshots`).
3. Add env vars from `.env.example` into `.env.local`.
4. In Supabase, insert at least one row in `app_settings` with your preferred `tie_rule`.
5. Add real records:
	- Create players from `/players` page (this inserts into `players`, `fantasy_teams`, `player_aliases`).
	- Insert your GPs in table `gps` (or via Supabase UI for now).
	- Upload screenshots from `/upload`.
	- Parse screenshots from `/upload` (Upload + Parse) or call `/api/parse-screenshot`.
	- Review/correct in `/gps/[gpId]/review`.
	- Save missing team scores in `/gps/[gpId]` and finalize the GP.

## Admin Authorization

- All write/parse/finalize endpoints now use admin verification.
- Accepted auth methods:
	- `x-admin-api-key: <ADMIN_API_KEY>`
	- `Authorization: Bearer <supabase_jwt>` where the token user email is in `ADMIN_EMAILS`
- Open mode behavior:
	- If no admin auth config is provided and `STRICT_ADMIN_AUTH=false`, writes are allowed (useful for initial setup).
	- Set `STRICT_ADMIN_AUTH=true` in production/private deployment to enforce admin checks.

## Current Write Endpoints

- `POST /api/players` create player + teams + aliases
- `POST /api/uploads` upload screenshots and create `screenshot_uploads` rows
- `POST /api/parse-screenshot` run OpenAI vision parse and insert `parsed_screenshot_results`
- `PATCH /api/parsed-results/[parsedResultId]` save corrections/approve + write `correction_logs`
- `PUT /api/gps/[gpId]/scores` upsert manual team scores for a player
- `POST /api/gps/[gpId]/finalize` compute deterministic punishment and lock result

## Architecture

- `src/app/*`: route pages and API routes
- `src/components/*`: shared shell, nav, and UI components
- `src/lib/types.ts`: domain types
- `src/lib/scoring.ts`: deterministic punishment/tie logic
- `src/lib/parser.ts`: OpenAI vision parser adapter
- `src/lib/data.ts`: Supabase-backed query layer used by pages and API routes
- `src/lib/supabase/*`: Supabase client helpers

## Tie Rule

Default tie rule is `lower_best_team_loses` and is configurable in DB `app_settings.tie_rule`.
