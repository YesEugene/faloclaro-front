/**
 * Generate audio for "Shops and Services" cluster phrases
 * 
 * Usage:
 * export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
 * node scripts/generate-audio-shops-services.js
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Load credentials explicitly
const credentialsPath = path.join(__dirname, '../google-credentials.json');
if (fs.existsSync(credentialsPath)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
}

const client = new textToSpeech.TextToSpeechClient();

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
  name: 'pt-PT-Wavenet-B', // Female voice
  ssmlGender: 'FEMALE',
};

const OUTPUT_DIR = path.join(__dirname, '../audio-output');
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
    
    return { filename, path: outputPath, skipped: false };
  } catch (error) {
    console.error(`❌ Error generating audio for phrase ${phrase.id}:`, error.message);
    throw error;
  }
}

async function uploadToSupabase(filePath, fileName) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(fileName, fileContent, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) {
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${fileName}:`, error.message);
    throw error;
  }
}

async function updatePhraseAudioUrl(phraseId, audioUrl) {
  const { error } = await supabase
    .from('phrases')
    .update({ audio_url: audioUrl })
    .eq('id', phraseId);

  if (error) {
    throw error;
  }
}

async function main() {
  try {
    console.log('🔍 Finding "Shops and Services" cluster...');
    
    // Find cluster
    const { data: cluster, error: clusterError } = await supabase
      .from('clusters')
      .select('id, name')
      .eq('name', 'Shops and Services')
      .single();

    if (clusterError || !cluster) {
      console.error('❌ Cluster "Shops and Services" not found:', clusterError);
      process.exit(1);
    }

    console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})`);

    // Get all phrases without audio
    console.log('📋 Loading phrases without audio...');
    const { data: phrases, error: phrasesError } = await supabase
      .from('phrases')
      .select('id, portuguese_text, audio_url')
      .eq('cluster_id', cluster.id)
      .is('audio_url', null)
      .order('order_index', { ascending: true });

    if (phrasesError) {
      console.error('❌ Error fetching phrases:', phrasesError);
      process.exit(1);
    }

    if (!phrases || phrases.length === 0) {
      console.log('✅ All phrases already have audio!');
      return;
    }

    console.log(`📝 Found ${phrases.length} phrases without audio`);

    let generated = 0;
    let uploaded = 0;
    let errors = 0;

    for (let i = 0; i < phrases.length; i++) {
      const phrase = phrases[i];
      
      try {
        console.log(`\n[${i + 1}/${phrases.length}] Processing: "${phrase.portuguese_text.substring(0, 50)}..."`);
        
        // Generate audio
        const audioResult = await generateAudio(phrase);
        
        if (audioResult.skipped) {
          console.log(`   ⏭️  Audio file already exists`);
        } else {
          console.log(`   ✅ Generated: ${audioResult.filename}`);
          generated++;
        }

        // Upload to Supabase Storage
        const audioUrl = await uploadToSupabase(audioResult.path, audioResult.filename);
        console.log(`   ✅ Uploaded: ${audioUrl}`);
        uploaded++;

        // Update phrase with audio URL
        await updatePhraseAudioUrl(phrase.id, audioUrl);
        console.log(`   ✅ Updated database`);

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`   ❌ Error processing phrase ${phrase.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n✅ Audio generation complete!');
    console.log(`   Generated: ${generated}`);
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

main();







