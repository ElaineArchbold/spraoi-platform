-- Fix: Add diagram_description column if missing, then re-run load-library.cjs to populate
-- Run this in Supabase SQL Editor

-- Add the column if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS diagram_description TEXT DEFAULT '';
ALTER TABLE activities ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';

-- Verify it exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activities' AND column_name IN ('diagram_description', 'status');
