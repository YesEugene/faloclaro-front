-- Email engine v1: templates + campaigns + enrollments + scheduling fields
-- Run in Supabase SQL editor (or apply via migrations pipeline).

-- Subscription users: lifecycle fields
ALTER TABLE subscription_users
  ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE subscription_users
  ADD COLUMN IF NOT EXISTS last_learning_activity_at TIMESTAMP WITH TIME ZONE;

-- Backfill registered_at from created_at where possible
UPDATE subscription_users
SET registered_at = COALESCE(registered_at, created_at)
WHERE registered_at IS NULL;

-- Email templates (editable in admin)
CREATE TABLE IF NOT EXISTS email_templates (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'core', -- core | neg | admin | system
  is_active BOOLEAN NOT NULL DEFAULT true,
  subject_ru TEXT NOT NULL DEFAULT '',
  subject_en TEXT NOT NULL DEFAULT '',
  body_ru TEXT NOT NULL DEFAULT '',
  body_en TEXT NOT NULL DEFAULT '',
  cta_enabled BOOLEAN NOT NULL DEFAULT false,
  cta_text_ru TEXT,
  cta_text_en TEXT,
  cta_url_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- Campaigns
CREATE TABLE IF NOT EXISTS email_campaigns (
  key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign steps
CREATE TABLE IF NOT EXISTS email_campaign_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key TEXT NOT NULL REFERENCES email_campaigns(key) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  template_key TEXT NOT NULL REFERENCES email_templates(key),
  delay_hours INTEGER NOT NULL DEFAULT 0,
  stop_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (campaign_key, step_index)
);

CREATE INDEX IF NOT EXISTS idx_email_campaign_steps_campaign ON email_campaign_steps(campaign_key);

-- Enrollments (state machine)
CREATE TABLE IF NOT EXISTS email_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES subscription_users(id) ON DELETE CASCADE,
  campaign_key TEXT NOT NULL REFERENCES email_campaigns(key) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active', -- active | stopped | completed
  current_step_index INTEGER NOT NULL DEFAULT 1,
  enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  next_send_at TIMESTAMP WITH TIME ZONE,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_error TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, campaign_key)
);

CREATE INDEX IF NOT EXISTS idx_email_enrollments_due ON email_enrollments(status, next_send_at);
CREATE INDEX IF NOT EXISTS idx_email_enrollments_user ON email_enrollments(user_id);

-- Extend email_logs to support engine metadata (keep legacy columns intact)
ALTER TABLE email_logs
  ADD COLUMN IF NOT EXISTS template_key TEXT,
  ADD COLUMN IF NOT EXISTS campaign_key TEXT,
  ADD COLUMN IF NOT EXISTS campaign_step_index INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent', -- sent | skipped | failed
  ADD COLUMN IF NOT EXISTS error TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_email_logs_campaign ON email_logs(campaign_key);
CREATE INDEX IF NOT EXISTS idx_email_logs_template ON email_logs(template_key);

-- RLS: keep enabled. Engine writes should use service role.
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_enrollments ENABLE ROW LEVEL SECURITY;

-- No public policies for these tables (admin/service role only).


