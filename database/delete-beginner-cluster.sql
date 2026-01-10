-- Migration: Delete Beginner cluster and all its phrases
-- Run this in Supabase SQL Editor

-- First, delete all phrases in Beginner cluster
DELETE FROM phrases 
WHERE cluster_id IN (
  SELECT id FROM clusters WHERE name = 'Beginner'
);

-- Then delete the Beginner cluster
DELETE FROM clusters 
WHERE name = 'Beginner';

-- Verify deletion
SELECT COUNT(*) as remaining_beginner_phrases 
FROM phrases 
WHERE cluster_id IN (
  SELECT id FROM clusters WHERE name = 'Beginner'
);







