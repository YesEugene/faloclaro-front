/**
 * Upload audio files for Day 1 lesson Task 3 (Listening Comprehension) to Supabase Storage
 * and update audio_url in phrases table
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const AUDIO_OUTPUT_DIR = path.join(__dirname, '../audio-output');
const STORAGE_BUCKET = 'audio';

function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .trim()
    // Remove punctuation and special characters but keep hyphens and spaces
    .replace(/[^\w\s\-àáâãäåèéêëìíîïòóôõöùúûüçñ]/g, '')
    // Normalize accented characters
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    // Replace spaces with dashes (but keep existing hyphens)
    .replace(/\s+/g, '-')
    // Remove multiple consecutive dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function uploadAudioFile(localPath, storagePath) {
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) {
      console.error(`❌ Error uploading ${storagePath}:`, error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${storagePath}:`, error.message);
    return null;
  }
}

async function updatePhraseAudioUrl(text, audioUrl) {
  // Check if phrase exists
  const { data: phraseArray } = await supabase
    .from('phrases')
    .select('id')
    .eq('portuguese_text', text)
    .limit(1);

  if (!phraseArray || phraseArray.length === 0) {
    // Phrase doesn't exist, skip
    console.log(`ℹ️  Phrase not found in database: "${text}"`);
    return false;
  }

  const phrase = phraseArray[0];

  // Update audio_url
  const { error: updateError } = await supabase
    .from('phrases')
    .update({ audio_url: audioUrl })
    .eq('id', phrase.id);

  if (updateError) {
    console.error(`❌ Error updating phrase "${text}":`, updateError.message);
    return false;
  }

  return true;
}

async function main() {
  console.log('🚀 Uploading audio files for Day 1 lesson Task 3 (Listening Comprehension)...\n');

  // Read YAML file
  const yamlPath = path.join(__dirname, '../Subsription/1 Day/day_01.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.error(`❌ YAML file not found: ${yamlPath}`);
    process.exit(1);
  }

  const yamlData = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  
  // Find task 3
  const task3 = yamlData.tasks?.find((task) => task.task_id === 3);
  if (!task3) {
    console.error('❌ Task 3 not found in YAML');
    process.exit(1);
  }

  // Collect all texts that need audio from items
  const textsToUpload = [];

  if (task3.items) {
    task3.items.forEach((item) => {
      if (item.audio) {
        textsToUpload.push(item.audio);
      }
    });
  }

  // Remove duplicates
  const uniqueTexts = [...new Set(textsToUpload)];
  console.log(`📝 Found ${uniqueTexts.length} unique texts to upload\n`);

  let uploaded = 0;
  let updated = 0;
  let errors = 0;
  let skipped = 0;

  for (const text of uniqueTexts) {
    // Generate filename
    const sanitized = sanitizeFilename(text);
    const filename = `lesson-1-task3-${sanitized}.mp3`;
    const localPath = path.join(AUDIO_OUTPUT_DIR, filename);
    const storagePath = `lesson-1/${filename}`;

    if (!fs.existsSync(localPath)) {
      console.log(`⏭️  Skipped (file not found): ${filename}`);
      skipped++;
      continue;
    }

    // Upload to storage
    console.log(`📤 Uploading: ${filename}...`);
    const audioUrl = await uploadAudioFile(localPath, storagePath);

    if (!audioUrl) {
      errors++;
      continue;
    }

    uploaded++;
    console.log(`✅ Uploaded: ${storagePath}`);
    console.log(`   URL: ${audioUrl}`);

    // Update phrase audio_url
    const updatedPhrase = await updatePhraseAudioUrl(text, audioUrl);
    if (updatedPhrase) {
      updated++;
      console.log(`✅ Updated phrase: "${text}"\n`);
    } else {
      console.log(`ℹ️  Phrase not found or already updated: "${text}"\n`);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Updated phrases: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);


