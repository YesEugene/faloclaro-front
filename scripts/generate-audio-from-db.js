/**
 * Generate audio for all phrases from database
 * 
 * This script will:
 * 1. Load all phrases from database
 * 2. Generate audio for each phrase using Google Cloud TTS
 * 3. Save files with proper naming
 * 4. Generate SQL to update audio_url in database
 * 
 * Usage:
 * export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
 * node scripts/generate-audio-from-db.js
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const client = new textToSpeech.TextToSpeechClient();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// European Portuguese voice (Female)
const VOICE_CONFIG = {
  languageCode: 'pt-PT',
  name: 'pt-PT-Wavenet-B', // Female voice
  ssmlGender: 'FEMALE',
};

const OUTPUT_DIR = path.join(__dirname, '../audio-output');
const SUPABASE_URL = supabaseUrl;
const STORAGE_BUCKET = 'audio';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100); // Limit filename length
}

async function generateAudio(phrase) {
  const filename = `phrase-${phrase.id}-${sanitizeFilename(phrase.portuguese_text)}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipped (exists): ${filename}`);
    return { filename, path: outputPath, skipped: true };
  }

  const request = {
    input: { text: phrase.portuguese_text },
    voice: VOICE_CONFIG,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
      pitch: 0.0,
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
    console.log(`✅ Generated: ${filename}`);
    return { filename, path: outputPath, skipped: false };
  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
    return { filename, path: null, skipped: false, error: error.message };
  }
}

async function loadPhrasesFromDB() {
  console.log('📥 Loading phrases from database...\n');

  const { data: phrases, error } = await supabase
    .from('phrases')
    .select('id, portuguese_text, audio_url')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('❌ Error loading phrases:', error);
    return [];
  }

  // Filter out phrases that already have audio_url
  const phrasesWithoutAudio = phrases.filter(p => !p.audio_url);

  console.log(`Found ${phrases.length} total phrases`);
  console.log(`Found ${phrasesWithoutAudio.length} phrases without audio\n`);

  return phrasesWithoutAudio;
}

async function generateAll() {
  console.log('🎙️  Generating audio files from database...\n');

  // Load phrases from database
  const phrases = await loadPhrasesFromDB();

  if (phrases.length === 0) {
    console.log('✅ All phrases already have audio!');
    return;
  }

  console.log(`Output directory: ${OUTPUT_DIR}\n`);

  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;
  const results = [];

  // Generate audio for each phrase
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    console.log(`[${i + 1}/${phrases.length}] Processing: "${phrase.portuguese_text.substring(0, 50)}..."`);
    
    const result = await generateAudio(phrase);
    results.push({ phrase, ...result });

    if (result.skipped) {
      skippedCount++;
    } else if (result.error) {
      errorCount++;
    } else {
      successCount++;
    }

    // Rate limiting: wait 200ms between requests
    if (i < phrases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✅ Generation complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Skipped (already exists): ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`\n📁 Files saved to: ${OUTPUT_DIR}`);

  // Generate SQL for updating audio_url
  if (successCount > 0) {
    console.log(`\n📝 Generating SQL for audio_url updates...`);
    generateUpdateSQL(results.filter(r => !r.skipped && !r.error));
  }

  console.log(`\n📤 Next step: Upload files to Supabase Storage bucket "audio"`);
}

function generateUpdateSQL(results) {
  const sqlPath = path.join(__dirname, '../update-audio-urls-from-db.sql');
  let sql = '-- Update audio_url for phrases from database\n';
  sql += '-- Generated automatically after audio generation\n\n';

  results.forEach(({ phrase, filename }) => {
    const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${filename}`;
    const escapedText = phrase.portuguese_text.replace(/'/g, "''");
    
    sql += `UPDATE phrases\n`;
    sql += `SET audio_url = '${audioUrl}'\n`;
    sql += `WHERE id = '${phrase.id}';\n\n`;
  });

  fs.writeFileSync(sqlPath, sql);
  console.log(`   ✅ SQL saved to: ${sqlPath}`);
  console.log(`   Run this SQL in Supabase SQL Editor after uploading files`);
}

// Run if called directly
if (require.main === module) {
  generateAll().catch(console.error);
}

module.exports = { generateAudio, loadPhrasesFromDB, generateAll };









