/**
 * Upload audio files to Supabase Storage
 * 
 * This script will:
 * 1. Read all audio files from audio-output directory
 * 2. Upload them to Supabase Storage bucket "audio"
 * 3. Update audio_url in database
 * 
 * Usage:
 * node scripts/upload-audio-to-storage.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key for uploads (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   For uploads, you need SUPABASE_SERVICE_ROLE_KEY');
  console.error('   Or configure Storage bucket RLS policies to allow public uploads');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const AUDIO_DIR = path.join(__dirname, '../audio-output');
const STORAGE_BUCKET = 'audio';

async function uploadFile(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, fileContent, {
      contentType: 'audio/mpeg',
      upsert: true, // Overwrite if exists
    });

  if (error) {
    console.error(`   ❌ Error uploading ${fileName}:`, error.message);
    return { success: false, error: error.message };
  }

  return { success: true, path: data.path };
}

async function updateAudioUrl(phraseId, audioUrl) {
  const { error } = await supabase
    .from('phrases')
    .update({ audio_url: audioUrl })
    .eq('id', phraseId);

  if (error) {
    console.error(`   ⚠ Error updating audio_url for ${phraseId}:`, error.message);
    return false;
  }

  return true;
}

async function extractPhraseIdFromFilename(filename) {
  // filename format: phrase-{uuid}-{text}.mp3
  const match = filename.match(/^phrase-([a-f0-9-]+)-/);
  return match ? match[1] : null;
}

async function main() {
  console.log('📤 Uploading audio files to Supabase Storage...\n');

  // Check if audio directory exists
  if (!fs.existsSync(AUDIO_DIR)) {
    console.error(`❌ Audio directory not found: ${AUDIO_DIR}`);
    process.exit(1);
  }

  // Get all MP3 files
  const files = fs.readdirSync(AUDIO_DIR)
    .filter(file => file.endsWith('.mp3'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No audio files found in audio-output directory');
    return;
  }

  console.log(`Found ${files.length} audio files to upload\n`);

  let successCount = 0;
  let errorCount = 0;
  let updateCount = 0;

  // Upload files
  for (let i = 0; i < files.length; i++) {
    const fileName = files[i];
    const filePath = path.join(AUDIO_DIR, fileName);
    
    console.log(`[${i + 1}/${files.length}] Uploading: ${fileName}`);

    const uploadResult = await uploadFile(filePath, fileName);

    if (uploadResult.success) {
      successCount++;
      
      // Extract phrase ID from filename and update database
      const phraseId = await extractPhraseIdFromFilename(fileName);
      if (phraseId) {
        const audioUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;
        const updated = await updateAudioUrl(phraseId, audioUrl);
        if (updated) {
          updateCount++;
        }
      } else {
        console.log(`   ⚠ Could not extract phrase ID from filename`);
      }
    } else {
      errorCount++;
    }

    // Small delay to avoid rate limiting
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Successfully uploaded: ${successCount}`);
  console.log(`   Database updated: ${updateCount}`);
  console.log(`   Errors: ${errorCount}`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { uploadFile, updateAudioUrl };

