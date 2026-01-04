/**
 * Generate audio for Beginner cluster phrases
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
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
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    .substring(0, 100);
}

async function generateAudio(phrase) {
  const filename = `phrase-${phrase.id}-${sanitizeFilename(phrase.portuguese_text)}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, filename);

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
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
    console.log(`✅ Generated: ${filename}`);
    return { filename, path: outputPath, skipped: false };
  } catch (error) {
    console.error(`❌ Error generating audio for "${phrase.portuguese_text}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Generating audio for Beginner cluster...\n');

  // Get Beginner cluster ID
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Beginner')
    .single();

  if (clusterError || !cluster) {
    console.error('❌ Beginner cluster not found:', clusterError?.message);
    process.exit(1);
  }

  console.log(`📁 Cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Get all phrases from Beginner cluster
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text, audio_url')
    .eq('cluster_id', cluster.id)
    .order('order_index', { ascending: true });

  if (phrasesError) {
    console.error('❌ Error loading phrases:', phrasesError.message);
    process.exit(1);
  }

  if (!phrases || phrases.length === 0) {
    console.error('❌ No phrases found in Beginner cluster');
    process.exit(1);
  }

  console.log(`📝 Found ${phrases.length} phrases\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const phrase of phrases) {
    const result = await generateAudio(phrase);
    if (result) {
      if (result.skipped) {
        skipped++;
      } else {
        generated++;
      }
    } else {
      errors++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Audio generation complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped (exists): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📋 Next step: Upload audio files to Supabase Storage`);
  console.log(`   Run: node scripts/upload-audio-to-storage-service-key.js`);
}

main().catch(console.error);

