/**
 * Generate audio for all words in "Cafes and Restaurants" cluster
 * that don't have audio_url yet
 * 
 * Usage:
 * node scripts/generate-audio-cafes-restaurants-words.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google Cloud TTS client
let ttsClient;
try {
  const credentialsPath = path.join(__dirname, '../google-credentials.json');
  if (fs.existsSync(credentialsPath)) {
    ttsClient = new TextToSpeechClient({
      keyFilename: credentialsPath,
    });
  } else {
    console.error('❌ google-credentials.json not found');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error initializing TTS client:', error);
  process.exit(1);
}

async function getCluster() {
  const { data: cluster, error } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Cafes and Restaurants')
    .single();

  if (error || !cluster) {
    console.error('❌ Cluster "Cafes and Restaurants" not found:', error);
    process.exit(1);
  }

  return cluster;
}

async function generateAudio(phrase) {
  try {
    const request = {
      input: { text: phrase.portuguese_text },
      voice: {
        languageCode: 'pt-PT',
        name: 'pt-PT-Wavenet-B',
        ssmlGender: 'MALE',
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    return response.audioContent;
  } catch (error) {
    console.error(`❌ Error generating audio for "${phrase.portuguese_text}":`, error.message);
    return null;
  }
}

async function uploadAudioToSupabase(audioBuffer, filename) {
  try {
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(filename, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('audio')
      .getPublicUrl(filename);

    return publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading audio "${filename}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting audio generation for "Cafes and Restaurants" cluster...\n');

  const cluster = await getCluster();
  console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Get all words without audio
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text, audio_url')
    .eq('cluster_id', cluster.id)
    .eq('phrase_type', 'word')
    .is('audio_url', null);

  if (phrasesError) {
    console.error('❌ Error fetching phrases:', phrasesError);
    process.exit(1);
  }

  if (phrases.length === 0) {
    console.log('✅ All phrases already have audio!');
    return;
  }

  console.log(`📋 Found ${phrases.length} phrases without audio\n`);

  let generated = 0;
  let uploaded = 0;
  let errors = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    console.log(`[${i + 1}/${phrases.length}] Processing: "${phrase.portuguese_text}..."`);

    // Generate audio
    const audioBuffer = await generateAudio(phrase);
    if (!audioBuffer) {
      errors++;
      continue;
    }
    generated++;

    // Upload to Supabase Storage
    const filename = `phrase-${phrase.id}-${phrase.portuguese_text.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.mp3`;
    const audioUrl = await uploadAudioToSupabase(audioBuffer, filename);
    if (!audioUrl) {
      errors++;
      continue;
    }
    uploaded++;

    // Update phrase with audio_url
    const { error: updateError } = await supabase
      .from('phrases')
      .update({ audio_url: audioUrl })
      .eq('id', phrase.id);

    if (updateError) {
      console.error(`❌ Error updating phrase "${phrase.portuguese_text}":`, updateError);
      errors++;
    } else {
      console.log(`   ✅ Generated: ${filename}`);
      console.log(`   ✅ Uploaded: ${audioUrl}`);
      console.log(`   ✅ Updated database`);
    }
  }

  console.log(`\n✅ Audio generation complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Uploaded: ${uploaded}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);






