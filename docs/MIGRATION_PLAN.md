# Migration plan

## Stage 1 — Stabilise
- Confirm Coach, Journey, Blitz, Challenge and Club each run from `apps/*`.
- Restore local environment variables from the backup; never commit secrets.
- Commit this baseline before refactoring.

## Stage 2 — Shared shell
- Extract module switcher, sidebar, top bar and account controls into `packages/ui`.
- Replace one app at a time, starting with Coach and Journey.

## Stage 3 — Shared data contracts
- Generate Supabase TypeScript types in `packages/database`.
- Define canonical Club, Team, Player, Parent, WeeklyPlan and JourneyActivity records.

## Stage 4 — Journey admin
- Add Journey Dashboard, Weekly Content, Players, Engagement, Preview, Parent Access and Settings to the Coach admin shell.
- Coach plans remain the source of truth; Journey stores child-facing overrides and per-player progress.

## Stage 5 — Remaining modules
- Migrate Blitz, Challenge and Club to the shared shell.
- Build Connect after shared auth, team and parent records are stable.
