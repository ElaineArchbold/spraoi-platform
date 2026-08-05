-- Spraoi Coach + Journey v1 starter schema
create extension if not exists pgcrypto;

create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  name text unique not null,
  sport text not null check (sport in ('hurling','football','athletic','multi')),
  category text not null,
  description text,
  age_groups text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','in_review','approved','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null,
  skill_id uuid not null references skills(id),
  sport text not null check (sport in ('hurling','football','athletic','multi')),
  category text not null,
  age_groups text[] not null,
  difficulty text not null check (difficulty in ('foundation','developing','advanced')),
  format text not null check (format in ('drill','game','warm_up','cool_down')),
  duration_mins int not null,
  players_min int not null,
  players_max int not null,
  equipment text not null,
  area_size text,
  indoor boolean not null default false,
  outdoor boolean not null default true,
  description text not null,
  coaching_points text not null,
  setup text not null,
  diagram_description text not null,
  source_url text,
  version text not null default '1.0',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_secondary_skills (
  activity_id uuid references activities(id) on delete cascade,
  skill_id uuid references skills(id) on delete cascade,
  primary key (activity_id, skill_id)
);

create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  title text not null,
  skill_id uuid not null references skills(id),
  sport text not null,
  age_groups text[] not null,
  difficulty text not null,
  level int not null check (level between 1 and 3),
  duration_mins int not null,
  description text not null,
  target text not null,
  video_url text not null default '',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  skill_id uuid not null references skills(id),
  title text not null,
  url text not null,
  audience text not null check (audience in ('coach','player','both')),
  status text not null default 'draft'
);

create table if not exists skill_progressions (
  from_skill_id uuid not null references skills(id),
  to_skill_id uuid not null references skills(id),
  relationship text not null,
  primary key (from_skill_id, to_skill_id, relationship)
);

create table if not exists weekly_plans (
  id uuid primary key default gen_random_uuid(),
  club_id uuid,
  age_group text not null,
  season text not null,
  week_number int not null,
  mode text not null check (mode in ('hurling_only','football_only','both')),
  hurling_focus_skill_id uuid references skills(id),
  football_focus_skill_id uuid references skills(id),
  athletic_focus_skill_id uuid references skills(id),
  hurling_challenge_id uuid references challenges(id),
  football_challenge_id uuid references challenges(id),
  athletic_challenge_id uuid references challenges(id),
  published_at timestamptz,
  share_token uuid unique default gen_random_uuid()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references weekly_plans(id) on delete cascade,
  session_number int not null,
  sport text not null check (sport in ('hurling','football','athletic','multi')),
  format text not null check (format in ('stations','sequence','game')),
  total_duration_mins int not null default 60,
  warmup_duration_mins int not null default 10,
  station_count int,
  unique (weekly_plan_id, session_number)
);

create table if not exists session_activities (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  activity_id uuid not null references activities(id),
  station_number int,
  sequence_number int,
  duration_override_mins int
);

create table if not exists player_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  weekly_plan_id uuid references weekly_plans(id),
  challenge_id uuid not null references challenges(id),
  completed boolean not null default false,
  completed_at timestamptz,
  unique (player_id, weekly_plan_id, challenge_id)
);
