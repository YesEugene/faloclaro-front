-- Subscription Course Database Schema
-- Run this in your Supabase SQL Editor

-- Users table (email-based, no password)
CREATE TABLE IF NOT EXISTS subscription_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  language_preference TEXT NOT NULL DEFAULT 'ru', -- 'ru', 'en', 'pt'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES subscription_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial', -- 'trial', 'active', 'expired', 'cancelled'
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons table (60 days of lessons)
CREATE TABLE IF NOT EXISTS lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_number INTEGER NOT NULL UNIQUE, -- 1-60
  title_ru TEXT NOT NULL,
  title_en TEXT NOT NULL,
  title_pt TEXT NOT NULL,
  subtitle_ru TEXT,
  subtitle_en TEXT,
  subtitle_pt TEXT,
  estimated_time TEXT, -- e.g., "15–25 минут"
  yaml_content JSONB, -- Full lesson structure from YAML
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES subscription_users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  tasks_completed INTEGER DEFAULT 0, -- 0-5
  total_tasks INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Task progress table (individual task completion)
CREATE TABLE IF NOT EXISTS task_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_progress_id UUID REFERENCES user_progress(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL, -- 1-5
  task_type TEXT NOT NULL, -- 'vocabulary', 'rules', 'listening_comprehension', 'attention', 'writing_optional'
  status TEXT NOT NULL DEFAULT 'not_started', -- 'not_started', 'in_progress', 'completed'
  completion_data JSONB, -- Store task-specific completion data (timer, answers, etc.)
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_progress_id, task_id)
);

-- Lesson access tokens (unique links for email)
CREATE TABLE IF NOT EXISTS lesson_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES subscription_users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE, -- Unique token for email link
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email logs (track sent emails)
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES subscription_users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id),
  day_number INTEGER NOT NULL,
  email_type TEXT NOT NULL, -- 'lesson', 'reminder', 'payment_request'
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_users_email ON subscription_users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_lessons_day_number ON lessons(day_number);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson_id ON user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_status ON user_progress(status);
CREATE INDEX IF NOT EXISTS idx_task_progress_user_progress_id ON task_progress(user_progress_id);
CREATE INDEX IF NOT EXISTS idx_lesson_access_tokens_token ON lesson_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_lesson_access_tokens_user_id ON lesson_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);

-- Enable Row Level Security
ALTER TABLE subscription_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for lessons (anyone can read lesson structure)
CREATE POLICY "Public read access for lessons" ON lessons
  FOR SELECT USING (true);

-- Users can only read their own data
CREATE POLICY "Users read own data" ON subscription_users
  FOR SELECT USING (true); -- Will be filtered by token in API

CREATE POLICY "Users read own subscriptions" ON subscriptions
  FOR SELECT USING (true); -- Will be filtered by token in API

CREATE POLICY "Users read own progress" ON user_progress
  FOR SELECT USING (true); -- Will be filtered by token in API

CREATE POLICY "Users read own task progress" ON task_progress
  FOR SELECT USING (true); -- Will be filtered by token in API

-- Service role can insert/update (for API routes)
-- Note: API routes should use service role key for writes









