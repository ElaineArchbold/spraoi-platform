-- Add gender column to age_groups and create girls groups
-- Run this in Supabase SQL Editor

-- Step 1: Add gender column
ALTER TABLE age_groups ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'boys';

-- Step 2: Mark existing groups as boys
UPDATE age_groups SET gender = 'boys' WHERE gender IS NULL OR gender = 'boys';

-- Step 3: Add girls groups (same ages, same club)
INSERT INTO age_groups (club_id, label, sport, gender)
SELECT c.id, ag.label, 'camogie', 'girls'
FROM clubs c, (VALUES ('U7'), ('U8'), ('U9'), ('U10'), ('U11'), ('U12'), ('U13'), ('U14')) AS ag(label)
WHERE c.slug = 'fingallians';

-- Step 4: Add some coaches (boys + girls)
-- Boys coaches
INSERT INTO coaches (club_id, name, role)
SELECT c.id, coach.name, 'coach'
FROM clubs c, (VALUES ('Donal'), ('Shane'), ('Mark'), ('Paul')) AS coach(name)
WHERE c.slug = 'fingallians'
ON CONFLICT DO NOTHING;

-- Girls coaches  
INSERT INTO coaches (club_id, name, role)
SELECT c.id, coach.name, 'coach'
FROM clubs c, (VALUES ('Sarah'), ('Emma'), ('Claire'), ('Lisa')) AS coach(name)
WHERE c.slug = 'fingallians'
ON CONFLICT DO NOTHING;
