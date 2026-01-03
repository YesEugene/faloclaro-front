-- Storage RLS Policies for audio bucket
-- Run this in Supabase SQL Editor

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Public read access for audio" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads to audio bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to audio bucket" ON storage.objects;
DROP POLICY IF EXISTS "Allow anonymous uploads to audio bucket" ON storage.objects;

-- Policy: Allow public read access to audio files
CREATE POLICY "Public read access for audio"
ON storage.objects
FOR SELECT
USING (bucket_id = 'audio');

-- Policy: Allow anonymous uploads to audio bucket (for script uploads)
-- This allows anyone to upload, which is needed for the upload script
CREATE POLICY "Allow anonymous uploads to audio bucket"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'audio');

-- Policy: Allow updates to audio files (for overwriting)
CREATE POLICY "Allow updates to audio bucket"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'audio');

