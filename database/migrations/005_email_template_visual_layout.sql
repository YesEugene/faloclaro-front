-- Email templates: optional visual layout JSON (per language)
-- Run in Supabase SQL editor once.

ALTER TABLE email_templates
  ADD COLUMN IF NOT EXISTS layout_json_ru JSONB,
  ADD COLUMN IF NOT EXISTS layout_json_en JSONB;


