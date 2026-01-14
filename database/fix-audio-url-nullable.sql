-- Fix: Make audio_url nullable temporarily (until audio files are uploaded)
-- Run this in Supabase SQL Editor BEFORE adding phrases

ALTER TABLE phrases 
ALTER COLUMN audio_url DROP NOT NULL;

-- After uploading all audio files, you can make it NOT NULL again:
-- ALTER TABLE phrases ALTER COLUMN audio_url SET NOT NULL;










