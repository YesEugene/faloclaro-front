/**
 * Upload audio files to Supabase Storage using Service Role Key
 * 
 * This script requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 * 
 * Usage:
 * node scripts/upload-audio-to-storage-service-key.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.error('\n📝 To get Service Role Key:');
  console.error('   1. Go to Supabase Dashboard → Project Settings → API');
  console.error('   2. Copy "service_role" key (secret)');
  console.error('   3. Add to .env.local: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

function extractPhraseIdFromFilename(filename) {
  // filename format: phrase-{uuid}-{text}.mp3
  // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars with dashes)
  const match = filename.match(/^phrase-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-/);
  if (match && match[1]) {
    return match[1];
  }
  // If no valid UUID found, return null (will skip this file)
  return null;
}

async function main() {
  console.log('📤 Uploading audio files to Supabase Storage...\n');
  console.log('   Using Service Role Key (bypasses RLS)\n');

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
  let skipCount = 0;

  // Upload files in batches to avoid overwhelming the API
  const BATCH_SIZE = 10;
  
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(files.length / BATCH_SIZE)} (${batch.length} files)...`);

    for (const fileName of batch) {
      const filePath = path.join(AUDIO_DIR, fileName);
      const phraseId = extractPhraseIdFromFilename(fileName);

      if (!phraseId) {
        console.log(`   ⚠ Skipping ${fileName} (could not extract phrase ID)`);
        skipCount++;
        continue;
      }

      // Check if already uploaded (by checking database)
      const { data: phrase } = await supabase
        .from('phrases')
        .select('audio_url')
        .eq('id', phraseId)
        .single();

      if (phrase && phrase.audio_url) {
        console.log(`   ⏭️  Skipping ${fileName} (already has audio_url)`);
        skipCount++;
        continue;
      }

      const uploadResult = await uploadFile(filePath, fileName);

      if (uploadResult.success) {
        successCount++;
        
        // Update database
        const audioUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;
        const updated = await updateAudioUrl(phraseId, audioUrl);
        if (updated) {
          updateCount++;
          console.log(`   ✅ Uploaded and updated: ${fileName.substring(0, 60)}...`);
        } else {
          console.log(`   ⚠ Uploaded but failed to update DB: ${fileName.substring(0, 60)}...`);
        }
      } else {
        errorCount++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Longer delay between batches
    if (i + BATCH_SIZE < files.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
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

module.exports = { uploadFile, updateAudioUrl };

