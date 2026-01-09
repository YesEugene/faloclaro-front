/**
 * Upload Day 3 lesson audio files to Supabase Storage
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

async function uploadFile(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  
  // Upload to lesson-3/ subdirectory
  const storagePath = `lesson-3/${fileName}`;
  
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

// Map of filename to Portuguese text
const audioTextMap = {
  'lesson-3-bom-dia-como-esta.mp3': 'Bom dia, como está?',
  'lesson-3-boa-tarde-tudo-bem.mp3': 'Boa tarde, tudo bem?',
  'lesson-3-boa-noite-ate-amanha.mp3': 'Boa noite, até amanhã.',
  'lesson-3-de-manha-bebo-cafe.mp3': 'De manhã bebo café.',
  'lesson-3-a-tarde-trabalho.mp3': 'À tarde trabalho.',
  'lesson-3-a-noite-descanso.mp3': 'À noite descanso.',
  'lesson-3-hoje-e-segunda-feira.mp3': 'Hoje é segunda-feira.',
  'lesson-3-ontem-foi-domingo.mp3': 'Ontem foi domingo.',
  'lesson-3-amanha-sera-terca-feira.mp3': 'Amanhã será terça-feira.',
  'lesson-3-de-manha.mp3': 'De manhã',
  'lesson-3-a-tarde.mp3': 'À tarde',
  'lesson-3-a-noite.mp3': 'À noite',
  // Vocabulary words
  'lesson-3-bom-dia.mp3': 'Bom dia',
  'lesson-3-boa-tarde.mp3': 'Boa tarde',
  'lesson-3-boa-noite.mp3': 'Boa noite',
  'lesson-3-agora.mp3': 'Agora',
  'lesson-3-hoje.mp3': 'Hoje',
  'lesson-3-amanha.mp3': 'Amanhã',
  'lesson-3-ontem.mp3': 'Ontem',
  // Vocabulary example sentences
  'lesson-3-agora-sao-tres-horas.mp3': 'Agora são três horas.',
  'lesson-3-hoje-e-segunda-feira.mp3': 'Hoje é segunda-feira.',
  'lesson-3-amanha-vou-ao-trabalho.mp3': 'Amanhã vou ao trabalho.',
  'lesson-3-ontem-fui-a-praia.mp3': 'Ontem fui à praia.',
};

function extractTextFromFilename(filename) {
  // First try the map
  if (audioTextMap[filename]) {
    return audioTextMap[filename];
  }
  
  // Fallback: Remove "lesson-3-" prefix and ".mp3" suffix
  const text = filename.replace(/^lesson-3-/, '').replace(/\.mp3$/, '');
  // Replace hyphens with spaces and capitalize first letter
  return text.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function main() {
  console.log('📤 Uploading Day 3 lesson audio files to Supabase Storage...\n');
  console.log('   Using Service Role Key (bypasses RLS)\n');

  // Check if audio directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    console.error(`❌ Audio directory not found: ${AUDIO_DIR}`);
    process.exit(1);
  }

  // Get all lesson-3 MP3 files
  const files = fs.readdirSync(AUDIO_DIR)
    .filter(file => file.startsWith('lesson-3-') && file.endsWith('.mp3'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No lesson-3 audio files found in audio-output directory');
    return;
  }

  console.log(`Found ${files.length} lesson-3 audio files to upload\n`);

  let successCount = 0;
  let errorCount = 0;
  let updateCount = 0;
  let skipCount = 0;

  for (const fileName of files) {
    const filePath = path.join(AUDIO_DIR, fileName);
    
    // Extract text from filename using map or fallback
    const portugueseText = extractTextFromFilename(fileName);

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
      const audioUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/lesson-3/${fileName}`;
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

