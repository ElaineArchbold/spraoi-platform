-- Add video_url column to skills table
-- Run this in Supabase SQL Editor

ALTER TABLE skills ADD COLUMN IF NOT EXISTS video_url TEXT;
