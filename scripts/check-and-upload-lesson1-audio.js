/**
 * Check and upload missing audio files for Day 1 lesson
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
    // Replace spaces with dashes
    .replace(/\s+/g, '-')
    // Remove multiple consecutive dashes
    .replace(/-+/g, '-')
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function checkFileInStorage(storagePath) {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list('lesson-1', {
        search: path.basename(storagePath)
      });
    
    if (error) {
      console.error(`❌ Error checking storage:`, error);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error(`❌ Exception checking storage:`, error);
    return false;
  }
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

async function main() {
  console.log('🔍 Checking and uploading Day 1 lesson audio files...\n');

  // Read YAML file
  const yamlPath = path.join(__dirname, '../Subsription/1 Day/day_01.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.error(`❌ YAML file not found: ${yamlPath}`);
    process.exit(1);
  }

  const yamlData = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  const vocabularyTask = yamlData.tasks?.find(t => t.type === 'vocabulary');

  if (!vocabularyTask || !vocabularyTask.content?.cards) {
    console.error('❌ Vocabulary task not found in YAML');
    process.exit(1);
  }

  const cards = vocabularyTask.content.cards;
  console.log(`📝 Found ${cards.length} cards\n`);

  let checked = 0;
  let uploaded = 0;
  let alreadyExists = 0;
  let errors = 0;

  for (const card of cards) {
    if (!card.word) {
      continue;
    }

    const wordSanitized = sanitizeFilename(card.word);
    const filename = `lesson-1-word-${wordSanitized}.mp3`;
    const localPath = path.join(AUDIO_OUTPUT_DIR, filename);
    const storagePath = `lesson-1/${filename}`;

    console.log(`\n📋 Checking: "${card.word}"`);
    console.log(`   Local file: ${filename}`);
    console.log(`   Storage path: ${storagePath}`);

    // Check if local file exists
    if (!fs.existsSync(localPath)) {
      console.log(`   ⚠️  Local file not found: ${filename}`);
      errors++;
      continue;
    }

    // Check if file exists in storage
    const existsInStorage = await checkFileInStorage(storagePath);
    
    if (existsInStorage) {
      console.log(`   ✅ Already exists in Storage`);
      alreadyExists++;
    } else {
      console.log(`   📤 Uploading to Storage...`);
      const audioUrl = await uploadAudioFile(localPath, storagePath);
      
      if (audioUrl) {
        console.log(`   ✅ Uploaded successfully`);
        console.log(`   URL: ${audioUrl}`);
        uploaded++;
      } else {
        console.log(`   ❌ Upload failed`);
        errors++;
      }
    }

    checked++;
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n\n✅ Check complete!`);
  console.log(`   Checked: ${checked}`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Already exists: ${alreadyExists}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);


