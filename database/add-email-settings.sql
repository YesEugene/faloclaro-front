-- Adds optional settings fields for subscription users.
-- Run this in Supabase SQL Editor once.

ALTER TABLE subscription_users
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT true;


