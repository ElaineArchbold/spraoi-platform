-- Add session_date column to sessions table
-- Run this in Supabase SQL Editor

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_date DATE;
