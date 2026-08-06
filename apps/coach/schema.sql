-- ============================================================
-- Spraoi Playbook + Progress - Database Schema
-- Run this in your Supabase SQL Editor (same project as blitz)
-- ============================================================

-- Clubs table (shared across all Spraoi modules)
CREATE TABLE IF NOT EXISTS clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,          -- e.g. 'fingallians', 'na-fianna'
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Age groups per club (U7, U8, U9, U10, U11, U12, etc.)
CREATE TABLE IF NOT EXISTS age_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                 -- e.g. 'U7', 'U8', 'U12'
  sport TEXT DEFAULT 'hurling',        -- 'hurling', 'football', 'camogie'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Skills library (shared across all clubs - the master catalogue)
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                  -- e.g. 'Jab Lift', 'Roll Lift', 'Striking'
  category TEXT NOT NULL,              -- e.g. 'ground_hurling', 'striking', 'catching'
  description TEXT,
  sport TEXT DEFAULT 'hurling',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Drills library (linked to skills, can be coach-facing or player-facing or both)
CREATE TABLE IF NOT EXISTS drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  title TEXT NOT NULL,                 -- e.g. 'Jab Lift - Wall Drill'
  description TEXT,                    -- coaching points / instructions
  video_url TEXT,                      -- YouTube embed URL
  audience TEXT DEFAULT 'both',        -- 'coach', 'player', 'both'
  difficulty TEXT DEFAULT 'beginner',  -- 'beginner', 'intermediate', 'advanced'
  duration_mins INT,                   -- estimated time
  equipment TEXT,                      -- e.g. 'hurley, sliotar, wall'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Weekly plans (the core sync mechanism - one per age group per week)
CREATE TABLE IF NOT EXISTS weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id) ON DELETE CASCADE,
  week_number INT NOT NULL,            -- 1, 2, 3... (sequential week of the season)
  season TEXT NOT NULL,                -- e.g. '2026-27'
  skill_focus_id UUID REFERENCES skills(id) ON DELETE SET NULL,
  coach_notes TEXT,                    -- notes for coaches on how to teach this week
  player_message TEXT,                 -- message shown to kids ("This week we're working on...")
  starts_at DATE,                      -- when this week becomes active
  created_by UUID,                     -- coach who created it
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Drills assigned to a specific weekly plan (ordered)
CREATE TABLE IF NOT EXISTS plan_drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
  sort_order INT DEFAULT 0,
  is_homework BOOLEAN DEFAULT false,   -- true = shows in kid's Progress app
  notes TEXT                           -- plan-specific notes for this drill
);

-- Player progress (kids marking drills as done)
CREATE TABLE IF NOT EXISTS player_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL,             -- references auth.users or a players table
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id),
  drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  xp_earned INT DEFAULT 10
);

-- Coaches (who can create/manage plans for their age group)
CREATE TABLE IF NOT EXISTS coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,                        -- references auth.users when auth is added
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group_id UUID REFERENCES age_groups(id),
  role TEXT DEFAULT 'coach',           -- 'head_coach', 'coach', 'assistant'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Row Level Security (ready for multi-club)
-- ============================================================

ALTER TABLE age_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- For now: open access (tighten when auth is added)
CREATE POLICY "Open access" ON clubs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON age_groups FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON skills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON drills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON weekly_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON plan_drills FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON player_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Open access" ON coaches FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Seed: Add Fingallians as the first club
-- ============================================================

INSERT INTO clubs (slug, name) VALUES ('fingallians', 'Fingallians GAA')
ON CONFLICT (slug) DO NOTHING;

-- Seed age groups for Fingallians
INSERT INTO age_groups (club_id, label, sport)
SELECT c.id, ag.label, 'hurling'
FROM clubs c, (VALUES ('U7'), ('U8'), ('U9'), ('U10'), ('U11'), ('U12'), ('U13'), ('U14')) AS ag(label)
WHERE c.slug = 'fingallians'
ON CONFLICT DO NOTHING;

-- Seed some starter skills
INSERT INTO skills (name, category, sport) VALUES
  ('Jab Lift', 'ground_hurling', 'hurling'),
  ('Roll Lift', 'ground_hurling', 'hurling'),
  ('Striking (ground)', 'striking', 'hurling'),
  ('Striking (air)', 'striking', 'hurling'),
  ('Solo Run', 'movement', 'hurling'),
  ('Hand Pass', 'passing', 'hurling'),
  ('Catching', 'catching', 'hurling'),
  ('Blocking', 'defending', 'hurling'),
  ('Hook', 'defending', 'hurling'),
  ('First Touch', 'ball_control', 'hurling'),
  ('Free Taking', 'set_pieces', 'hurling'),
  ('Sideline Cut', 'set_pieces', 'hurling'),
  ('Doubling', 'striking', 'hurling'),
  ('Shoulder', 'tackling', 'hurling'),
  ('Puck Out (GK)', 'goalkeeping', 'hurling')
ON CONFLICT DO NOTHING;
