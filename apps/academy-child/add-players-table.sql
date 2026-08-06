-- Add players table for Journey app
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id UUID NOT NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id),
  name TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '🏑',
  xp_total INT DEFAULT 0,
  streak_days INT DEFAULT 0,
  level INT DEFAULT 1,
  last_active DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON players;
CREATE POLICY "open" ON players FOR ALL USING (true) WITH CHECK (true);

-- Badges table
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '⭐',
  xp_threshold INT,
  skill_id UUID REFERENCES skills(id),
  criteria TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON badges;
CREATE POLICY "open" ON badges FOR ALL USING (true) WITH CHECK (true);

-- Player badges (earned)
CREATE TABLE IF NOT EXISTS player_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(player_id, badge_id)
);

ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "open" ON player_badges;
CREATE POLICY "open" ON player_badges FOR ALL USING (true) WITH CHECK (true);

-- Seed some starter badges
INSERT INTO badges (name, description, emoji, xp_threshold) VALUES
  ('First Steps', 'Complete your first homework', '👣', 10),
  ('Getting Started', 'Earn 50 XP', '🌱', 50),
  ('On Fire', 'Earn 100 XP', '🔥', 100),
  ('Unstoppable', 'Earn 250 XP', '⚡', 250),
  ('Legend', 'Earn 500 XP', '🏆', 500),
  ('3 Day Streak', 'Practice 3 days in a row', '📅', NULL),
  ('7 Day Streak', 'Practice 7 days in a row', '🗓️', NULL),
  ('All Done', 'Complete all homework in a week', '✅', NULL)
ON CONFLICT DO NOTHING;
