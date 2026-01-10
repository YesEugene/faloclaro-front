-- Migration 002: Clean start - Remove all existing lesson data
-- ⚠️ WARNING: This will delete all existing lessons and related data!
-- Only run this if you want to start fresh (Вариант B - Чистый старт)

-- 1. Delete all task progress (depends on user_progress)
DELETE FROM task_progress;

-- 2. Delete all user progress (depends on lessons)
DELETE FROM user_progress;

-- 3. Delete all lesson access tokens (depends on lessons)
DELETE FROM lesson_access_tokens;

-- 4. Delete all email logs (depends on lessons)
DELETE FROM email_logs;

-- 5. Delete all audio files (depends on lessons)
DELETE FROM audio_files WHERE lesson_id IS NOT NULL;

-- 6. Delete all lessons
DELETE FROM lessons;

-- 7. Reset sequences if needed (PostgreSQL will handle this automatically)

-- Note: This migration assumes you have exported existing lessons to JSON backup
-- before running this migration.


