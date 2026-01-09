-- Update schema to support movie phrases
-- Run this in Supabase SQL Editor

-- Add movie fields to phrases table
ALTER TABLE phrases 
ADD COLUMN IF NOT EXISTS movie_title TEXT,
ADD COLUMN IF NOT EXISTS movie_character TEXT,
ADD COLUMN IF NOT EXISTS movie_year INTEGER;

-- Add index for movie queries
CREATE INDEX IF NOT EXISTS idx_phrases_movie_title ON phrases(movie_title);







