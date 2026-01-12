-- Migration 003: Fix RLS policies for levels and audio_files
-- Run this if you already ran 001 but need to fix RLS policies

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for levels" ON levels;
DROP POLICY IF EXISTS "Public read access for audio_files" ON audio_files;

-- Recreate policies with service role access
CREATE POLICY "Public read access for levels" ON levels
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to levels" ON levels
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Public read access for audio_files" ON audio_files
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to audio_files" ON audio_files
  FOR ALL USING (auth.role() = 'service_role');



