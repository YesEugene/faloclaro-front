-- FaloClaro Database Schema
-- Run this in your Supabase SQL Editor

-- Clusters table (learning scope categories)
CREATE TABLE IF NOT EXISTS clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phrases table (Portuguese sentences)
CREATE TABLE IF NOT EXISTS phrases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
  portuguese_text TEXT NOT NULL,
  ipa_transcription TEXT,
  audio_url TEXT, -- URL to pre-generated audio file (nullable until files are uploaded)
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Translations table (multi-language support)
CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_id UUID REFERENCES phrases(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL, -- e.g., 'en', 'ru', 'es'
  translation_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(phrase_id, language_code)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_phrases_cluster_id ON phrases(cluster_id);
CREATE INDEX IF NOT EXISTS idx_phrases_order_index ON phrases(cluster_id, order_index);
CREATE INDEX IF NOT EXISTS idx_translations_phrase_id ON translations(phrase_id);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language_code);

-- Enable Row Level Security (RLS) - public read access for v1
ALTER TABLE clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE phrases ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Public read policies (no auth required in v1)
CREATE POLICY "Public read access for clusters" ON clusters
  FOR SELECT USING (true);

CREATE POLICY "Public read access for phrases" ON phrases
  FOR SELECT USING (true);

CREATE POLICY "Public read access for translations" ON translations
  FOR SELECT USING (true);

