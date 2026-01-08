/**
 * Generate audio for Day 1 lesson Task 3 (Listening Comprehension task)
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Google Cloud TTS client with credentials file
const credentialsPath = path.join(__dirname, '../google-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error('❌ google-credentials.json not found at:', credentialsPath);
  process.exit(1);
}

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: credentialsPath,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// European Portuguese voice (Female)
const VOICE_CONFIG = {
  languageCode: 'pt-PT',
  name: 'pt-PT-Wavenet-B',
  ssmlGender: 'FEMALE',
};

const OUTPUT_DIR = path.join(__dirname, '../audio-output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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

async function generateAudio(text, outputFilename) {
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipped (exists): ${outputFilename}`);
    return { filename: outputFilename, path: outputPath, skipped: true };
  }

  const request = {
    input: { text },
    voice: VOICE_CONFIG,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
    console.log(`✅ Generated: ${outputFilename}`);
    return { filename: outputFilename, path: outputPath, skipped: false };
  } catch (error) {
    console.error(`❌ Error generating audio for "${text}":`, error.message);
    return null;
  }
}

async function checkAudioInPhrases(text) {
  // Check if audio already exists in phrases table
  const { data: phraseArray } = await supabase
    .from('phrases')
    .select('id, audio_url')
    .eq('portuguese_text', text)
    .limit(1);

  if (phraseArray && phraseArray.length > 0 && phraseArray[0]?.audio_url) {
    console.log(`ℹ️  Audio exists in phrases table for: "${text}"`);
    return phraseArray[0].audio_url;
  }

  return null;
}

async function main() {
  console.log('🚀 Generating audio for Day 1 lesson Task 3 (Listening Comprehension)...\n');

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

  console.log('📋 Task 3 found:', {
    type: task3.type,
    itemsCount: task3.items?.length || 0,
  });

  // Collect all texts that need audio from items
  const textsToGenerate = [];
  const textSources = [];

  if (task3.items) {
    task3.items.forEach((item, index) => {
      if (item.audio) {
        textsToGenerate.push(item.audio);
        textSources.push({ 
          text: item.audio, 
          itemId: item.item_id || index + 1, 
          question: item.question 
        });
      }
    });
  }

  // Remove duplicates
  const uniqueTexts = [...new Set(textsToGenerate)];
  console.log(`📝 Found ${uniqueTexts.length} unique texts to generate audio for\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;
  const audioFiles = [];

  for (const text of uniqueTexts) {
    // Check if audio exists in phrases table
    const existingAudioUrl = await checkAudioInPhrases(text);
    if (existingAudioUrl) {
      console.log(`⏭️  Skipped (exists in DB): ${text}`);
      skipped++;
      continue;
    }

    // Generate audio
    const sanitized = sanitizeFilename(text);
    const filename = `lesson-1-task3-${sanitized}.mp3`;
    const result = await generateAudio(text, filename);

    if (result) {
      if (result.skipped) {
        skipped++;
      } else {
        generated++;
        audioFiles.push({
          text: text,
          filename: result.filename,
          path: result.path,
        });
      }
    } else {
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Audio generation complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped (exists): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📋 Generated files:`);
  audioFiles.forEach(file => {
    console.log(`   - ${file.filename} (${file.text})`);
  });
  console.log(`\n📋 Next step: Upload audio files to Supabase Storage`);
  console.log(`   Run: node scripts/upload-audio-lesson-day1-task3.js`);
}

main().catch(console.error);

