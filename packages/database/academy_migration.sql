-- Review against your existing schema before running.
create table if not exists academy_weeks (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid references weekly_plans(id) on delete set null,
  club_id uuid references clubs(id) on delete cascade,
  age_group_id uuid references age_groups(id) on delete cascade,
  week_start date not null,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists academy_week_items (
  id uuid primary key default gen_random_uuid(),
  academy_week_id uuid references academy_weeks(id) on delete cascade,
  skill_id uuid references skills(id),
  challenge_id uuid references challenges(id),
  source_session_activity_id uuid references session_activities(id),
  child_title text not null,
  child_instructions text,
  target_value numeric,
  target_unit text,
  xp_reward integer default 10,
  is_visible boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists academy_player_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references players(id) on delete cascade,
  academy_week_item_id uuid references academy_week_items(id) on delete cascade,
  status text default 'not_started' check (status in ('not_started','started','completed')),
  completed_at timestamptz,
  xp_awarded integer default 0,
  unique(player_id, academy_week_item_id)
);
