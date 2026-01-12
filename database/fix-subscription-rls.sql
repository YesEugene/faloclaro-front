-- Fix RLS policies for subscription tables
-- Run this in Supabase SQL Editor

-- Allow public INSERT for subscription_users (for registration)
DROP POLICY IF EXISTS "Public insert access for subscription_users" ON subscription_users;
CREATE POLICY "Public insert access for subscription_users" ON subscription_users
  FOR INSERT
  WITH CHECK (true);

-- Allow public SELECT for subscription_users (for checking if user exists)
DROP POLICY IF EXISTS "Public read access for subscription_users" ON subscription_users;
CREATE POLICY "Public read access for subscription_users" ON subscription_users
  FOR SELECT
  USING (true);

-- Allow public INSERT for subscriptions (for trial creation)
DROP POLICY IF EXISTS "Public insert access for subscriptions" ON subscriptions;
CREATE POLICY "Public insert access for subscriptions" ON subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow public SELECT for subscriptions (for checking subscription status)
DROP POLICY IF EXISTS "Public read access for subscriptions" ON subscriptions;
CREATE POLICY "Public read access for subscriptions" ON subscriptions
  FOR SELECT
  USING (true);

-- Allow public UPDATE for subscriptions (for updating subscription status)
DROP POLICY IF EXISTS "Public update access for subscriptions" ON subscriptions;
CREATE POLICY "Public update access for subscriptions" ON subscriptions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public INSERT for lesson_access_tokens
DROP POLICY IF EXISTS "Public insert access for lesson_access_tokens" ON lesson_access_tokens;
CREATE POLICY "Public insert access for lesson_access_tokens" ON lesson_access_tokens
  FOR INSERT
  WITH CHECK (true);

-- Allow public SELECT for lesson_access_tokens (for verifying token)
DROP POLICY IF EXISTS "Public read access for lesson_access_tokens" ON lesson_access_tokens;
CREATE POLICY "Public read access for lesson_access_tokens" ON lesson_access_tokens
  FOR SELECT
  USING (true);

-- Allow public UPDATE for lesson_access_tokens (for marking as used)
DROP POLICY IF EXISTS "Public update access for lesson_access_tokens" ON lesson_access_tokens;
CREATE POLICY "Public update access for lesson_access_tokens" ON lesson_access_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public INSERT for email_logs
DROP POLICY IF EXISTS "Public insert access for email_logs" ON email_logs;
CREATE POLICY "Public insert access for email_logs" ON email_logs
  FOR INSERT
  WITH CHECK (true);

-- Allow public INSERT for user_progress
DROP POLICY IF EXISTS "Public insert access for user_progress" ON user_progress;
CREATE POLICY "Public insert access for user_progress" ON user_progress
  FOR INSERT
  WITH CHECK (true);

-- Allow public UPDATE for user_progress
DROP POLICY IF EXISTS "Public update access for user_progress" ON user_progress;
CREATE POLICY "Public update access for user_progress" ON user_progress
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public INSERT for task_progress
DROP POLICY IF EXISTS "Public insert access for task_progress" ON task_progress;
CREATE POLICY "Public insert access for task_progress" ON task_progress
  FOR INSERT
  WITH CHECK (true);

-- Allow public UPDATE for task_progress
DROP POLICY IF EXISTS "Public update access for task_progress" ON task_progress;
CREATE POLICY "Public update access for task_progress" ON task_progress
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Note: For production, you might want to add more restrictive policies
-- that check user_id matches the authenticated user, but for now
-- we allow public access since we're using token-based authentication








