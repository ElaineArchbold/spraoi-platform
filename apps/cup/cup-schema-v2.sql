-- Spraoi Cup V1 relational foundation
-- Additive migration: does NOT remove the legacy kv_store used by the current participant app.
-- Run in Supabase SQL Editor when ready to start the new organiser/event model.

create extension if not exists pgcrypto;

create table if not exists public.cup_events (
  id uuid primary key default gen_random_uuid(),
  club_id uuid references public.clubs(id) on delete cascade,
  name text not null,
  event_date date,
  venue text,
  status text not null default 'draft' check (status in ('draft','published','live','completed','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cup_competitions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cup_events(id) on delete cascade,
  name text not null,
  sport text,
  age_group text,
  gender text,
  format text not null default 'round_robin',
  created_at timestamptz not null default now()
);

create table if not exists public.cup_teams (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.cup_competitions(id) on delete cascade,
  club_team_id uuid references public.age_groups(id) on delete set null,
  name text not null,
  club_name text,
  grade text,
  is_host boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cup_pitches (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cup_events(id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.cup_fixtures (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.cup_competitions(id) on delete cascade,
  team_a_id uuid references public.cup_teams(id) on delete set null,
  team_b_id uuid references public.cup_teams(id) on delete set null,
  pitch_id uuid references public.cup_pitches(id) on delete set null,
  starts_at timestamptz,
  stage text not null default 'group',
  final_label text,
  status text not null default 'scheduled',
  goals_a integer not null default 0,
  points_a integer not null default 0,
  goals_b integer not null default 0,
  points_b integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cup_announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cup_events(id) on delete cascade,
  message text not null,
  publish_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.cup_sponsors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.cup_events(id) on delete cascade,
  name text not null,
  logo_url text,
  website_url text,
  created_at timestamptz not null default now()
);

create index if not exists cup_events_club_idx on public.cup_events(club_id);
create index if not exists cup_competitions_event_idx on public.cup_competitions(event_id);
create index if not exists cup_teams_competition_idx on public.cup_teams(competition_id);
create index if not exists cup_fixtures_competition_idx on public.cup_fixtures(competition_id);
create index if not exists cup_fixtures_starts_at_idx on public.cup_fixtures(starts_at);

-- Development policies. Tighten these when Cup RBAC is connected to Club roles.
alter table public.cup_events enable row level security;
alter table public.cup_competitions enable row level security;
alter table public.cup_teams enable row level security;
alter table public.cup_pitches enable row level security;
alter table public.cup_fixtures enable row level security;
alter table public.cup_announcements enable row level security;
alter table public.cup_sponsors enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['cup_events','cup_competitions','cup_teams','cup_pitches','cup_fixtures','cup_announcements','cup_sponsors']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)', t || '_authenticated_all', t);
  end loop;
end $$;
