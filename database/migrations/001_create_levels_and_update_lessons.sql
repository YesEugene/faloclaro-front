-- Migration 001: Create levels table and update lessons table
-- This migration prepares the database for the new CRM system
-- Run this in Supabase SQL Editor

-- 1. Create levels table (уровни/модули)
CREATE TABLE IF NOT EXISTS levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_number INTEGER NOT NULL UNIQUE,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ru TEXT,
  description_en TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes for levels
CREATE INDEX IF NOT EXISTS idx_levels_level_number ON levels(level_number);
CREATE INDEX IF NOT EXISTS idx_levels_order_index ON levels(order_index);

-- 3. Add new columns to lessons table
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS order_in_level INTEGER,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;

-- 4. Add indexes for lessons
CREATE INDEX IF NOT EXISTS idx_lessons_level_id ON lessons(level_id);
CREATE INDEX IF NOT EXISTS idx_lessons_is_published ON lessons(is_published);
CREATE INDEX IF NOT EXISTS idx_lessons_order_in_level ON lessons(order_in_level);

-- 5. Create audio_files table for managing audio
CREATE TABLE IF NOT EXISTS audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
  task_id INTEGER, -- номер задачи (1-5)
  block_id TEXT, -- идентификатор блока (например, "block_1", "word_1")
  item_id TEXT, -- идентификатор элемента (например, "example_1", "card_1")
  text_pt TEXT NOT NULL, -- португальский текст для генерации
  audio_url TEXT, -- URL в Supabase Storage
  storage_path TEXT, -- путь в storage (например, "lessons/1/audio/word_1.mp3")
  generation_method TEXT DEFAULT 'tts', -- 'tts' или 'upload'
  generated_at TIMESTAMP WITH TIME ZONE,
  uploaded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add indexes for audio_files
CREATE INDEX IF NOT EXISTS idx_audio_files_lesson_id ON audio_files(lesson_id);
CREATE INDEX IF NOT EXISTS idx_audio_files_text_pt ON audio_files(text_pt);
CREATE INDEX IF NOT EXISTS idx_audio_files_block_id ON audio_files(block_id);

-- 7. Enable RLS for new tables
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_files ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for levels (public read access, service role write access)
CREATE POLICY "Public read access for levels" ON levels
  FOR SELECT USING (true);

-- Allow service role to insert/update/delete levels
CREATE POLICY "Service role full access to levels" ON levels
  FOR ALL USING (auth.role() = 'service_role');

-- 9. Create RLS policies for audio_files (public read access, service role write access)
CREATE POLICY "Public read access for audio_files" ON audio_files
  FOR SELECT USING (true);

-- Allow service role to insert/update/delete audio_files
CREATE POLICY "Service role full access to audio_files" ON audio_files
  FOR ALL USING (auth.role() = 'service_role');

-- Note: API routes use service role, so they have full access

