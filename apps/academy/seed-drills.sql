-- ============================================================
-- Seed drills for the skills library
-- Run this in Supabase SQL Editor after schema.sql
-- ============================================================

-- Jab Lift drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('Jab Lift - Wall Drill', 'Player faces wall 2m away. Jab lift and catch repeatedly. Focus on getting under the sliotar.', 'both', 'beginner', 5, 'hurley, sliotar, wall'),
  ('Jab Lift - Partner Drill', 'In pairs. One rolls the sliotar, other jab lifts and hand passes back. Swap after 10.', 'coach', 'beginner', 8, 'hurley, sliotar'),
  ('Jab Lift - On the Move', 'Player jogs forward, coach rolls sliotar into their path. Jab lift without breaking stride.', 'both', 'intermediate', 8, 'hurley, sliotar'),
  ('Jab Lift - Under Pressure', 'Same as wall drill but defender shadows. Lift and play away within 2 seconds.', 'coach', 'advanced', 10, 'hurley, sliotar')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Jab Lift';

-- Roll Lift drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('Roll Lift - Stationary', 'Place sliotar on ground. Roll over with hurley and flick up to hand. Repeat 20 times.', 'both', 'beginner', 5, 'hurley, sliotar'),
  ('Roll Lift - Walking', 'Walk forward, roll lift every 5 steps. Focus on smooth motion.', 'both', 'beginner', 5, 'hurley, sliotar'),
  ('Roll Lift - Game Scenario', 'Coach throws sliotar to ground, player sprints, roll lifts, solos and strikes at goal.', 'coach', 'intermediate', 10, 'hurley, sliotar, goals')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Roll Lift';

-- Striking drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('Ground Strike - Cones', 'Line of 5 cones at varying distances. Strike sliotar along ground through each gap.', 'both', 'beginner', 8, 'hurley, sliotar, cones'),
  ('Air Strike - Target Wall', 'Drop from hand and strike against wall target. Aim for consistent height.', 'both', 'intermediate', 8, 'hurley, sliotar, wall'),
  ('Striking Under Pressure', 'Player solos in, defender closes. Must strike within 3 seconds of final catch.', 'coach', 'advanced', 10, 'hurley, sliotar')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Striking (ground)';

-- Solo Run drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('Solo - Straight Line', 'Solo from one end to the other in a straight line. Count touches.', 'both', 'beginner', 5, 'hurley, sliotar'),
  ('Solo - Cone Weave', 'Set up cones in zigzag. Solo through without dropping.', 'both', 'intermediate', 8, 'hurley, sliotar, cones'),
  ('Solo - Relay Race', 'Teams of 4. Solo to cone and back, pass to next player. First team done wins.', 'coach', 'beginner', 10, 'hurley, sliotar, cones')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Solo Run';

-- Hand Pass drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('Hand Pass - Pairs', 'Pairs stand 5m apart. Hand pass back and forth. Emphasise flat hand, follow through.', 'both', 'beginner', 5, 'sliotar'),
  ('Hand Pass - Triangle', '3 players in triangle. Pass and move to next cone. Keep ball moving.', 'coach', 'intermediate', 8, 'sliotar, cones'),
  ('Hand Pass - Moving Target', 'Passer stationary. Receiver runs across. Time the pass.', 'both', 'intermediate', 8, 'sliotar')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Hand Pass';

-- Catching drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('High Catch - Self Throw', 'Throw sliotar high, catch overhead with two hands. Repeat 20 times.', 'both', 'beginner', 5, 'sliotar'),
  ('Catching - Partner Puck', 'Partner strikes from 15m. Catch cleanly overhead. Rotate.', 'both', 'intermediate', 8, 'hurley, sliotar'),
  ('Catching - Contested', 'Two players compete for the same high ball. Coach pucks in.', 'coach', 'advanced', 10, 'hurley, sliotar')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Catching';

-- Blocking drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('Block - Front Block', 'Pairs. One strikes along ground, other blocks with hurley flat. Swap.', 'both', 'beginner', 5, 'hurley, sliotar'),
  ('Block - Closing Down', 'Attacker solos in and strikes. Defender times the block.', 'coach', 'intermediate', 10, 'hurley, sliotar')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'Blocking';

-- First Touch drills
INSERT INTO drills (skill_id, title, description, audience, difficulty, duration_mins, equipment)
SELECT s.id, d.title, d.description, d.audience, d.difficulty, d.duration_mins, d.equipment
FROM skills s, (VALUES
  ('First Touch - Chest and Catch', 'Partner throws at various heights. Control with chest/hand and secure.', 'both', 'beginner', 5, 'sliotar'),
  ('First Touch - On the Hurley', 'Partner pucks along ground. Control on bas of hurley, lift to hand.', 'both', 'intermediate', 8, 'hurley, sliotar')
) AS d(title, description, audience, difficulty, duration_mins, equipment)
WHERE s.name = 'First Touch';
