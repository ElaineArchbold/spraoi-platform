-- journey_exercises table for fitness tasks set by coaches
CREATE TABLE IF NOT EXISTS journey_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES weekly_plans(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id),
  club_id UUID REFERENCES clubs(id),
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INTEGER DEFAULT 5,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add exercise_id column to player_progress for tracking
ALTER TABLE player_progress ADD COLUMN IF NOT EXISTS exercise_id UUID REFERENCES journey_exercises(id);

-- Enable RLS
ALTER TABLE journey_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY journey_exercises_read ON journey_exercises FOR SELECT USING (true);
CREATE POLICY journey_exercises_write ON journey_exercises FOR ALL USING (true);

-- journey_events table for opt-in sessions (Friday night hurling, squad sessions)
CREATE TABLE IF NOT EXISTS journey_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id UUID REFERENCES clubs(id),
  age_group_id UUID REFERENCES age_groups(id),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,
  event_time TEXT,
  location TEXT,
  xp_reward INTEGER DEFAULT 15,
  recurring BOOLEAN DEFAULT false,
  recurring_day TEXT, -- e.g. 'friday'
  max_spots INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track who opted in
CREATE TABLE IF NOT EXISTS journey_event_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES journey_events(id) ON DELETE CASCADE,
  player_id UUID REFERENCES journey_players(id),
  signed_up_at TIMESTAMPTZ DEFAULT NOW(),
  attended BOOLEAN DEFAULT false,
  xp_awarded BOOLEAN DEFAULT false
);

-- Add event_id to player_progress
ALTER TABLE player_progress ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES journey_events(id);

-- RLS
ALTER TABLE journey_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY journey_events_read ON journey_events FOR SELECT USING (true);
CREATE POLICY journey_events_write ON journey_events FOR ALL USING (true);
ALTER TABLE journey_event_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY journey_event_signups_read ON journey_event_signups FOR SELECT USING (true);
CREATE POLICY journey_event_signups_write ON journey_event_signups FOR ALL USING (true);
