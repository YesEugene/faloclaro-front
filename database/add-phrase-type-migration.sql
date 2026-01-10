-- Migration: Add phrase_type field and set all existing phrases to 'long_sentence'
-- Run this in Supabase SQL Editor

-- Add phrase_type column to phrases table
ALTER TABLE phrases 
ADD COLUMN IF NOT EXISTS phrase_type VARCHAR(20) DEFAULT 'long_sentence';

-- Add check constraint
ALTER TABLE phrases 
ADD CONSTRAINT phrase_type_check 
CHECK (phrase_type IN ('word', 'short_sentence', 'long_sentence'));

-- Set all existing phrases to 'long_sentence'
UPDATE phrases 
SET phrase_type = 'long_sentence' 
WHERE phrase_type IS NULL OR phrase_type = '';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_phrases_phrase_type ON phrases(phrase_type);
CREATE INDEX IF NOT EXISTS idx_phrases_cluster_type ON phrases(cluster_id, phrase_type);

-- Add comment
COMMENT ON COLUMN phrases.phrase_type IS 'Type of phrase: word, short_sentence, or long_sentence';







