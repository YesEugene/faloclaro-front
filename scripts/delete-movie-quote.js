/**
 * Delete a movie quote by phrase ID
 * 
 * Usage:
 * node scripts/delete-movie-quote.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Phrase ID to delete
const PHRASE_ID = 'd57f1bb8-1916-45c8-8507-99a7ca80766d';

async function deletePhrase() {
  console.log('🗑️  Deleting movie quote...\n');
  console.log(`📋 Phrase ID: ${PHRASE_ID}\n`);

  try {
    // First, get the phrase to get audio_url
    const { data: phrase, error: phraseFetchError } = await supabase
      .from('phrases')
      .select('id, portuguese_text, audio_url')
      .eq('id', PHRASE_ID)
      .single();

    if (phraseFetchError || !phrase) {
      console.error('❌ Phrase not found:', phraseFetchError);
      process.exit(1);
    }

    console.log(`📝 Phrase: "${phrase.portuguese_text}"`);
    if (phrase.audio_url) {
      console.log(`🎵 Audio URL: ${phrase.audio_url}`);
    }
    console.log('');

    // Delete audio file from storage if exists
    if (phrase.audio_url) {
      try {
        // Extract filename from URL
        const urlParts = phrase.audio_url.split('/');
        const filename = urlParts[urlParts.length - 1];
        
        console.log(`🗑️  Deleting audio file: ${filename}...`);
        const { error: storageError } = await supabase.storage
          .from('audio')
          .remove([filename]);

        if (storageError) {
          console.warn(`⚠️  Warning: Could not delete audio file: ${storageError.message}`);
        } else {
          console.log(`✅ Audio file deleted\n`);
        }
      } catch (error) {
        console.warn(`⚠️  Warning: Error deleting audio file: ${error.message}\n`);
      }
    }

    // Delete translations
    console.log('🗑️  Deleting translations...');
    const { error: transError } = await supabase
      .from('translations')
      .delete()
      .eq('phrase_id', PHRASE_ID);

    if (transError) {
      console.error('❌ Error deleting translations:', transError);
      process.exit(1);
    }
    console.log('✅ Translations deleted\n');

    // Delete phrase
    console.log('🗑️  Deleting phrase...');
    const { error: phraseError } = await supabase
      .from('phrases')
      .delete()
      .eq('id', PHRASE_ID);

    if (phraseError) {
      console.error('❌ Error deleting phrase:', phraseError);
      process.exit(1);
    }
    console.log('✅ Phrase deleted\n');

    console.log('✅ Deletion complete!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

deletePhrase().catch(console.error);









