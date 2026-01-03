-- Delete all old phrases (before new import from Clasters folder)
-- Run this in Supabase SQL Editor
-- WARNING: This will delete all phrases and their translations!

-- Delete all translations first (CASCADE will handle it, but being explicit)
DELETE FROM translations;

-- Delete all phrases
DELETE FROM phrases;

-- Note: After running this, you need to re-run the import script:
-- node scripts/import-clusters.js
-- 
-- This will ensure only phrases from Clasters folder remain

