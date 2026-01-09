-- Sample data for FaloClaro
-- Run this in Supabase SQL Editor after applying schema.sql

-- Insert sample clusters
INSERT INTO clusters (name, description, order_index) VALUES
('Приветствия', 'Основные приветствия и знакомство', 1),
('В ресторане', 'Фразы для заказа еды и напитков', 2),
('Покупки', 'Фразы для шопинга', 3),
('Путешествия', 'Фразы для путешествий и навигации', 4);

-- Get cluster IDs (you'll need to replace these with actual IDs from your database)
-- First, check the IDs in Table Editor, then use them below

-- Example: Insert phrases for "Приветствия" cluster
-- Replace 'YOUR_CLUSTER_ID_HERE' with actual cluster ID from clusters table
/*
INSERT INTO phrases (cluster_id, portuguese_text, ipa_transcription, audio_url, order_index) VALUES
(
  (SELECT id FROM clusters WHERE name = 'Приветствия' LIMIT 1),
  'Olá, como está?',
  'ˈɔlɐ ˈkomu ɨʃˈta',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/ola-como-esta.mp3',
  1
),
(
  (SELECT id FROM clusters WHERE name = 'Приветствия' LIMIT 1),
  'Bom dia!',
  'bõ ˈdiɐ',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/bom-dia.mp3',
  2
),
(
  (SELECT id FROM clusters WHERE name = 'Приветствия' LIMIT 1),
  'Boa tarde!',
  'ˈboɐ ˈtaɾdɨ',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/boa-tarde.mp3',
  3
);

-- Add translations
INSERT INTO translations (phrase_id, language_code, translation_text)
SELECT 
  p.id,
  'en',
  CASE 
    WHEN p.portuguese_text = 'Olá, como está?' THEN 'Hello, how are you?'
    WHEN p.portuguese_text = 'Bom dia!' THEN 'Good morning!'
    WHEN p.portuguese_text = 'Boa tarde!' THEN 'Good afternoon!'
  END
FROM phrases p
WHERE p.portuguese_text IN ('Olá, como está?', 'Bom dia!', 'Boa tarde!');
*/

-- Alternative: Insert with explicit cluster selection
-- This will work once you have clusters inserted above

-- Step 1: Insert phrases (replace cluster_id with actual ID from clusters table)
/*
INSERT INTO phrases (cluster_id, portuguese_text, ipa_transcription, audio_url, order_index)
SELECT 
  id,
  'Olá, como está?',
  'ˈɔlɐ ˈkomu ɨʃˈta',
  'https://youvkbqaruadfpqxxbwi.supabase.co/storage/v1/object/public/audio/ola-como-esta.mp3',
  1
FROM clusters WHERE name = 'Приветствия' LIMIT 1;
*/



