/**
 * Upload Day 4 lesson audio files to Supabase Storage
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
  
  // Upload to lesson-4/ subdirectory
  const storagePath = `lesson-4/${fileName}`;
  
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

function extractTextFromFilename(filename) {
  // Map specific filenames to their Portuguese text
  const audioTextMap = {
    'lesson-4-preciso.mp3': 'Preciso',
    'lesson-4-preciso-de-ajuda.mp3': 'Preciso de ajuda.',
    'lesson-4-ajuda.mp3': 'Ajuda',
    'lesson-4-pode.mp3': 'Pode',
    'lesson-4-pode-ajudar.mp3': 'Pode ajudar?',
    'lesson-4-ajudar.mp3': 'Ajudar',
    'lesson-4-pode-ajudar-agora.mp3': 'Pode ajudar agora?',
    'lesson-4-sim-posso-ajudar.mp3': 'Sim, posso ajudar.',
    'lesson-4-obrigado.mp3': 'Obrigado',
    'lesson-4-obrigado-pela-ajuda.mp3': 'Obrigado pela ajuda.',
    'lesson-4-obrigada.mp3': 'Obrigada',
    'lesson-4-hoje-nao.mp3': 'Hoje não',
    'lesson-4-hoje-nao-posso.mp3': 'Hoje não posso.',
    'lesson-4-so.mp3': 'Só',
    'lesson-4-so-amanha.mp3': 'Só amanhã.',
    'lesson-4-resposta.mp3': 'Resposta',
    'lesson-4-esta-e-a-resposta.mp3': 'Esta é a resposta.',
  };

  // First try the map
  if (audioTextMap[filename]) {
    return audioTextMap[filename];
  }
  
  // Fallback: Remove "lesson-4-" prefix and ".mp3" suffix
  let text = filename.replace(/^lesson-4-/, '').replace(/\.mp3$/, '');
  // Replace hyphens with spaces
  text = text.replace(/-/g, ' ');
  // Capitalize first letter of each word
  text = text.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  
  // Specific corrections for common Portuguese phrases
  text = text.replace(/Hoje Nao/g, 'Hoje não');
  text = text.replace(/Hoje Nao Posso/g, 'Hoje não posso.');
  text = text.replace(/So/g, 'Só');
  text = text.replace(/So Amanha/g, 'Só amanhã.');
  text = text.replace(/Preciso De Ajuda/g, 'Preciso de ajuda.');
  text = text.replace(/Pode Ajudar/g, 'Pode ajudar?');
  text = text.replace(/Pode Ajudar Agora/g, 'Pode ajudar agora?');
  text = text.replace(/Obrigado Pela Ajuda/g, 'Obrigado pela ajuda.');
  text = text.replace(/Esta E A Resposta/g, 'Esta é a resposta.');
  
  return text;
}

async function main() {
  console.log('📤 Uploading Day 4 lesson audio files to Supabase Storage...\n');
  console.log('   Using Service Role Key (bypasses RLS)\n');

  // Check if audio directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    console.error(`❌ Audio directory not found: ${AUDIO_DIR}`);
    process.exit(1);
  }

  // Get all lesson-4 MP3 files
  const files = fs.readdirSync(AUDIO_DIR)
    .filter(file => file.startsWith('lesson-4-') && file.endsWith('.mp3'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No lesson-4 audio files found in audio-output directory');
    return;
  }

  console.log(`Found ${files.length} lesson-4 audio files to upload\n`);

  let uploaded = 0;
  let linked = 0;
  let errors = 0;
  let skipped = 0;

  for (const fileName of files) {
    const filePath = path.join(AUDIO_DIR, fileName);
    const portugueseText = extractTextFromFilename(fileName);

    console.log(`📄 Processing: ${fileName}`);
    console.log(`   Text: "${portugueseText}"`);

    // Find or create phrase
    const phrase = await findOrCreatePhrase(portugueseText);
    if (!phrase) {
      console.log(`   ❌ Failed to find or create phrase`);
      errors++;
      continue;
    }

    // Check if audio URL already exists and matches
    if (phrase.audio_url) {
      const existingPath = phrase.audio_url.split('/').pop();
      if (existingPath === fileName || existingPath === `lesson-4/${fileName}`) {
        console.log(`   ⏭️  Skipped (audio_url already set): ${phrase.audio_url}`);
        skipped++;
        continue;
      }
    }

    // Upload file
    console.log(`   📤 Uploading to storage...`);
    const uploadResult = await uploadFile(filePath, fileName);

    if (!uploadResult.success) {
      errors++;
      continue;
    }

    uploaded++;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(uploadResult.path);

    const publicUrl = urlData.publicUrl;

    // Update phrase with audio URL
    console.log(`   🔗 Linking to phrase...`);
    const updateSuccess = await updatePhraseAudio(phrase.id, publicUrl);

    if (updateSuccess) {
      linked++;
      console.log(`   ✅ Linked: ${publicUrl}`);
    } else {
      errors++;
      console.log(`   ⚠️  Uploaded but failed to link`);
    }

    console.log('');
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Linked: ${linked}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);

