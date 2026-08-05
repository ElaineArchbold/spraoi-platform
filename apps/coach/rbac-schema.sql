-- ============================================================
-- RBAC Schema for Spraoi Sports Platform
-- Run in Supabase SQL Editor
-- ============================================================

-- Modules available in the platform
CREATE TABLE IF NOT EXISTS platform_modules (
  id TEXT PRIMARY KEY,  -- 'coach', 'blitz', 'connect', 'journey', 'challenge'
  label TEXT NOT NULL,
  color TEXT,
  sort_order INT DEFAULT 0
);

INSERT INTO platform_modules (id, label, color, sort_order) VALUES
  ('coach', 'Coach', '#8e24aa', 1),
  ('blitz', 'Blitz', '#e65100', 2),
  ('connect', 'Connect', '#fbc02d', 3),
  ('journey', 'Journey', '#0277bd', 4),
  ('challenge', 'Challenge', '#43a047', 5)
ON CONFLICT (id) DO NOTHING;

-- Which modules each club has purchased/enabled
CREATE TABLE IF NOT EXISTS club_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES platform_modules(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  enabled_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, module_id)
);

-- User roles within the platform
-- Levels: super_admin > club_admin > coach > parent
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,  -- references auth.users
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'club_admin', 'coach', 'parent')),
  modules TEXT[] DEFAULT '{}',  -- which modules this user can access (empty = all bought by club)
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, club_id)
);

-- Which age groups a coach is assigned to
CREATE TABLE IF NOT EXISTS coach_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  age_group_id UUID REFERENCES age_groups(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, age_group_id)
);

-- RLS
ALTER TABLE platform_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_assignments ENABLE ROW LEVEL SECURITY;

-- Open policies for now (tighten later with proper auth checks)
CREATE POLICY "open" ON platform_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON club_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open" ON coach_assignments FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: Give Fingallians all modules + set you as super admin
-- Replace YOUR_EMAIL with your actual Supabase auth email
-- ============================================================

-- Give Fingallians all modules
INSERT INTO club_modules (club_id, module_id)
SELECT c.id, m.id
FROM clubs c, platform_modules m
WHERE c.slug = 'fingallians'
ON CONFLICT (club_id, module_id) DO NOTHING;

-- NOTE: After you log in for the first time, run this to make yourself super admin:
-- INSERT INTO user_roles (user_id, club_id, role)
-- SELECT auth.uid(), c.id, 'super_admin'
-- FROM clubs c WHERE c.slug = 'fingallians';
--
-- Or if you know your user ID from auth.users:
-- INSERT INTO user_roles (user_id, club_id, role)
-- VALUES ('YOUR-AUTH-USER-UUID', (SELECT id FROM clubs WHERE slug='fingallians'), 'super_admin');
