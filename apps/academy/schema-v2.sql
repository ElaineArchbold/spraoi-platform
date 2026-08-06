-- ============================================================
-- Spraoi Coach + Journey — Schema v2 (FINAL ARCHITECTURE)
-- Run this in Supabase SQL Editor
-- This REPLACES the earlier schema
-- ============================================================

-- Drop old tables if they exist (fresh start)
DROP TABLE IF EXISTS player_progress CASCADE;
DROP TABLE IF EXISTS session_activities CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS plan_drills CASCADE;
DROP TABLE IF EXISTS weekly_plans CASCADE;
DROP TABLE IF EXISTS skill_progressions CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS challenges CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS drills CASCADE;
DROP TABLE IF EXISTS coaches CASCADE;
DROP TABLE IF EXISTS age_groups CASCADE;
DROP TABLE IF EXISTS skills CASCADE;
DROP TABLE IF EXISTS clubs CASCADE;

-- ============================================================
-- CORE TABLES
-- ============================================================

-- Clubs (shared across all Spraoi modules)
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Skills (THE SPINE - everything hangs off this)
CREATE TABLE skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'hurling',       -- hurling, football, athletic, multi
  category TEXT NOT NULL,                       -- ground_hurling, striking, passing, movement, etc.
  description TEXT,
  age_groups TEXT[] DEFAULT '{}',              -- e.g. {'U7','U8','U9','U10'}
  difficulty TEXT DEFAULT 'foundation',         -- foundation, developing, advanced
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Skill Progressions (skill A leads to skill B)
CREATE TABLE skill_progressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  next_skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0
);

-- Activities (COACH DRILLS - what coaches use in sessions)
-- club_id = NULL means global (Spraoi library). club_id = X means custom (that club only).
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,  -- NULL = global library
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  coaching_points TEXT,
  setup TEXT,
  equipment TEXT,
  players_min INT,
  players_max INT,
  duration_mins INT,
  area_size TEXT,
  indoor BOOLEAN DEFAULT true,
  outdoor BOOLEAN DEFAULT true,
  difficulty TEXT DEFAULT 'foundation',
  format TEXT DEFAULT 'drill',                  -- drill, game, warm_up, cool_down
  secondary_skills UUID[] DEFAULT '{}',
  age_groups TEXT[] DEFAULT '{}',
  sport TEXT DEFAULT 'hurling',
  diagram_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Challenges (KID HOMEWORK - pre-written, child-friendly tasks per skill)
-- Same logic: club_id = NULL is global, club_id = X is club-custom
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,  -- NULL = global library
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  target TEXT,
  sport TEXT DEFAULT 'hurling',
  difficulty TEXT DEFAULT 'foundation',
  duration_mins INT DEFAULT 10,
  video_url TEXT,
  age_groups TEXT[] DEFAULT '{}',
  level INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Club Library Curation (which global activities are visible to this club)
-- If no rows exist for a club, ALL global activities are visible (default open).
-- Once a club starts curating, only approved = true items show for coaches.
CREATE TABLE club_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT true,
  visible_age_groups TEXT[] DEFAULT '{}',        -- empty = all age groups
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, activity_id)
);

-- Videos (linked to skills, audience-tagged)
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  audience TEXT DEFAULT 'both',                 -- coach, player, both
  duration_secs INT,
  sport TEXT DEFAULT 'hurling',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PLANNING TABLES
-- ============================================================

-- Age groups per club
CREATE TABLE age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                          -- U7, U8, U9...
  sport TEXT DEFAULT 'hurling',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Coaches
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group_id UUID REFERENCES age_groups(id),
  role TEXT DEFAULT 'coach',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly Plans (per club, per age group, per week)
CREATE TABLE weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id) ON DELETE CASCADE,
  week_number INT NOT NULL,
  season TEXT NOT NULL,                         -- e.g. '2026-27'
  mode TEXT NOT NULL DEFAULT 'hurling',         -- hurling, football, both
  hurling_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  football_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  athletic_skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  hurling_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  football_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  athletic_challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  coach_notes TEXT,
  player_message TEXT,
  published BOOLEAN DEFAULT false,             -- coach must confirm before kids see it
  share_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(8), 'hex'),
  starts_at DATE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sessions (per plan, numbered)
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  session_number INT NOT NULL DEFAULT 1,        -- 1, 2, 3...
  sport TEXT NOT NULL DEFAULT 'hurling',
  format TEXT DEFAULT 'stations',               -- stations, sequence, game
  total_duration_mins INT DEFAULT 60,
  warmup_duration_mins INT DEFAULT 10,
  station_count INT,
  time_per_station_mins INT,                    -- auto-calculated or overridden
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Session Activities (drills assigned to a session)
CREATE TABLE session_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  station_number INT,                           -- null if format != stations
  sort_order INT DEFAULT 0,
  duration_override_mins INT,                   -- null = use auto-calculated time
  assigned_coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL,
  notes TEXT
);

-- Coach favourites (quick-access drills)
CREATE TABLE coach_favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES coaches(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(coach_id, activity_id)
);

-- ============================================================
-- PLAYER TABLES
-- ============================================================

-- Bonus tasks (coach-created extras: "Attend Friday hurling", "Watch county match" etc.)
CREATE TABLE bonus_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                          -- e.g. "Attend Friday Night Hurling"
  description TEXT,                             -- optional detail
  xp_reward INT DEFAULT 15,                    -- more XP than standard homework
  repeatable BOOLEAN DEFAULT false,            -- can they earn it multiple times?
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Player progress (kids completing challenges AND bonus tasks)
CREATE TABLE player_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id),
  challenge_id UUID REFERENCES challenges(id) ON DELETE SET NULL,
  bonus_task_id UUID REFERENCES bonus_tasks(id) ON DELETE SET NULL,
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE SET NULL,
  score INT,                                    -- optional score/count
  completed_at TIMESTAMPTZ DEFAULT now(),
  xp_earned INT DEFAULT 10
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_progressions ENABLE ROW LEVEL SECURITY;

-- Open access for now (tighten with auth later)
CREATE POLICY "open" ON clubs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON videos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON age_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON coaches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON weekly_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON session_activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON coach_favourites FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON club_library FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON player_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON bonus_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON skill_progressions FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Fingallians
INSERT INTO clubs (slug, name) VALUES ('fingallians', 'Fingallians GAA')
ON CONFLICT (slug) DO NOTHING;

-- Age groups
INSERT INTO age_groups (club_id, label, sport)
SELECT c.id, ag.label, 'hurling'
FROM clubs c, (VALUES ('U7'), ('U8'), ('U9'), ('U10'), ('U11'), ('U12'), ('U13'), ('U14')) AS ag(label)
WHERE c.slug = 'fingallians';

-- Core hurling skills
INSERT INTO skills (name, sport, category, age_groups, difficulty) VALUES
  ('Jab Lift', 'hurling', 'ground_hurling', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Roll Lift', 'hurling', 'ground_hurling', '{"U8","U9","U10","U11","U12"}', 'foundation'),
  ('Ground Strike', 'hurling', 'striking', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Air Strike', 'hurling', 'striking', '{"U9","U10","U11","U12","U13","U14"}', 'developing'),
  ('Solo Run', 'hurling', 'movement', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Hand Pass', 'hurling', 'passing', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Catching', 'hurling', 'catching', '{"U8","U9","U10","U11","U12","U13"}', 'foundation'),
  ('Blocking', 'hurling', 'defending', '{"U9","U10","U11","U12","U13","U14"}', 'developing'),
  ('Hook', 'hurling', 'defending', '{"U10","U11","U12","U13","U14"}', 'developing'),
  ('First Touch', 'hurling', 'ball_control', '{"U8","U9","U10","U11","U12"}', 'foundation'),
  ('Doubling', 'hurling', 'striking', '{"U10","U11","U12","U13","U14"}', 'advanced'),
  ('Free Taking', 'hurling', 'set_pieces', '{"U10","U11","U12","U13","U14"}', 'developing'),
  ('Sideline Cut', 'hurling', 'set_pieces', '{"U11","U12","U13","U14"}', 'advanced'),
  ('Puck Out', 'hurling', 'goalkeeping', '{"U10","U11","U12","U13","U14"}', 'developing'),
  ('Shoulder', 'hurling', 'tackling', '{"U11","U12","U13","U14"}', 'developing');

-- Core football skills
INSERT INTO skills (name, sport, category, age_groups, difficulty) VALUES
  ('Solo (football)', 'football', 'movement', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Hand Pass (football)', 'football', 'passing', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Kick Pass', 'football', 'passing', '{"U8","U9","U10","U11","U12","U13"}', 'foundation'),
  ('High Catch (football)', 'football', 'catching', '{"U9","U10","U11","U12","U13"}', 'developing'),
  ('Shooting', 'football', 'scoring', '{"U8","U9","U10","U11","U12","U13"}', 'foundation'),
  ('Tackling (football)', 'football', 'defending', '{"U10","U11","U12","U13","U14"}', 'developing');

-- Athletic skills
INSERT INTO skills (name, sport, category, age_groups, difficulty) VALUES
  ('Acceleration', 'athletic', 'speed', '{"U7","U8","U9","U10","U11","U12","U13","U14"}', 'foundation'),
  ('Agility', 'athletic', 'movement', '{"U7","U8","U9","U10","U11","U12","U13","U14"}', 'foundation'),
  ('Balance', 'athletic', 'coordination', '{"U7","U8","U9","U10","U11","U12"}', 'foundation'),
  ('Coordination', 'athletic', 'coordination', '{"U7","U8","U9","U10","U11","U12"}', 'foundation');
