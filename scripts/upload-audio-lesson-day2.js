/**
 * Upload Day 2 lesson audio files to Supabase Storage
 * and link them to phrases table
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const AUDIO_DIR = path.join(__dirname, '../audio-output');
const STORAGE_BUCKET = 'audio';

// Map of filename to Portuguese text
const audioTextMap = {
  'lesson-2-de-onde.mp3': 'De onde',
  'lesson-2-sou-de.mp3': 'Sou de',
  'lesson-2-vivo-em.mp3': 'Vivo em',
  'lesson-2-moro-em.mp3': 'Moro em',
  'lesson-2-es-de.mp3': 'És de',
  'lesson-2-venho-de.mp3': 'Venho de',
  'lesson-2-aqui.mp3': 'Aqui',
  'lesson-2-agora.mp3': 'Agora',
  'lesson-2-cidade.mp3': 'Cidade',
  'lesson-2-pais.mp3': 'País',
  'lesson-2-sou-de-lisboa.mp3': 'Sou de Lisboa.',
  'lesson-2-venho-de-porto.mp3': 'Venho de Porto.',
  'lesson-2-vivo-em-lisboa.mp3': 'Vivo em Lisboa.',
  'lesson-2-moro-em-porto.mp3': 'Moro em Porto.',
  'lesson-2-venho-de-lisboa.mp3': 'Venho de Lisboa.',
  'lesson-2-sou-de-porto.mp3': 'Sou de Porto.',
  'lesson-2-vivo-em-porto.mp3': 'Vivo em Porto.',
  'lesson-2-venho-de-braga.mp3': 'Venho de Braga.',
  'lesson-2-moro-em-coimbra.mp3': 'Moro em Coimbra.',
};

async function uploadFile(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  
  // Upload to lesson-2/ subdirectory
  const storagePath = `lesson-2/${fileName}`;
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileContent, {
      contentType: 'audio/mpeg',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error(`   ❌ Error uploading ${fileName}:`, error.message);
    return { success: false, error: error.message };
  }

  return { success: true, path: data.path };
}

async function findOrCreatePhrase(portugueseText) {
  // First, try to find existing phrase
  const { data: existingPhrase, error: findError } = await supabase
    .from('phrases')
    .select('id, audio_url')
    .eq('portuguese_text', portugueseText)
    .single();

  if (existingPhrase && !findError) {
    return { id: existingPhrase.id, audio_url: existingPhrase.audio_url, created: false };
  }

  // If not found, create new phrase
  const { data: newPhrase, error: createError } = await supabase
    .from('phrases')
    .insert({
      portuguese_text: portugueseText,
    })
    .select('id')
    .single();

  if (createError) {
    console.error(`   ❌ Error creating phrase for "${portugueseText}":`, createError.message);
    return null;
  }

  return { id: newPhrase.id, audio_url: null, created: true };
}

async function updatePhraseAudio(phraseId, audioUrl) {
  const { error } = await supabase
    .from('phrases')
    .update({ audio_url: audioUrl })
    .eq('id', phraseId);

  if (error) {
    console.error(`   ⚠ Error updating audio_url for phrase ${phraseId}:`, error.message);
    return false;
  }

  return true;
}

async function main() {
  console.log('📤 Uploading Day 2 lesson audio files to Supabase Storage...\n');
  console.log('   Using Service Role Key (bypasses RLS)\n');

  // Check if audio directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    console.error(`❌ Audio directory not found: ${AUDIO_DIR}`);
    process.exit(1);
  }

  // Get all lesson-2 MP3 files
  const files = fs.readdirSync(AUDIO_DIR)
    .filter(file => file.startsWith('lesson-2-') && file.endsWith('.mp3'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No lesson-2 audio files found in audio-output directory');
    return;
  }

  console.log(`Found ${files.length} lesson-2 audio files to upload\n`);

  let successCount = 0;
  let errorCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  for (const fileName of files) {
    const filePath = path.join(AUDIO_DIR, fileName);
    const portugueseText = audioTextMap[fileName];

    if (!portugueseText) {
      console.log(`   ⚠ Skipping ${fileName} (text not found in map)`);
      skipCount++;
      continue;
    }

    console.log(`\n📝 Processing: ${fileName}`);
    console.log(`   Text: "${portugueseText}"`);

    // Find or create phrase
    const phrase = await findOrCreatePhrase(portugueseText);
    if (!phrase) {
      errorCount++;
      continue;
    }

    if (phrase.created) {
      console.log(`   ✅ Created new phrase (ID: ${phrase.id})`);
    } else {
      console.log(`   ℹ️  Found existing phrase (ID: ${phrase.id})`);
    }

    // Check if audio already uploaded
    if (phrase.audio_url) {
      console.log(`   ⏭️  Skipping upload (already has audio_url)`);
      skipCount++;
      continue;
    }

    // Upload file
    const uploadResult = await uploadFile(filePath, fileName);

    if (uploadResult.success) {
      successCount++;
      
      // Update database with audio URL
      const audioUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/lesson-2/${fileName}`;
      const updated = await updatePhraseAudio(phrase.id, audioUrl);
      if (updated) {
        updateCount++;
        console.log(`   ✅ Uploaded and linked to phrase`);
      } else {
        console.log(`   ⚠ Uploaded but failed to update DB`);
      }
    } else {
      errorCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n\n✅ Upload complete!`);
  console.log(`   Successfully uploaded: ${successCount}`);
  console.log(`   Database updated: ${updateCount}`);
  console.log(`   Skipped: ${skipCount}`);
  console.log(`   Errors: ${errorCount}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadFile, findOrCreatePhrase, updatePhraseAudio };

