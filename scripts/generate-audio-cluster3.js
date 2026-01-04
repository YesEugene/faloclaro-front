/**
 * Generate audio for cluster 3 phrases only
 * 
 * Usage:
 * export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
 * node scripts/generate-audio-cluster3.js
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const client = new textToSpeech.TextToSpeechClient();

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
    .substring(0, 100);
}

async function generateAudio(phrase) {
  const filename = `phrase-${phrase.id}-${sanitizeFilename(phrase.portuguese_text)}.mp3`;
  const outputPath = path.join(OUTPUT_DIR, filename);

  // Skip if already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipped (exists): ${filename}`);
    return { filename, path: outputPath, skipped: true, phraseId: phrase.id };
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
    console.log(`✅ Generated: ${filename}`);
    return { filename, path: outputPath, skipped: false, phraseId: phrase.id };
  } catch (error) {
    console.error(`❌ Error generating ${filename}:`, error.message);
    return { filename, path: null, skipped: false, error: error.message, phraseId: phrase.id };
  }
}

async function main() {
  console.log('🎵 Генерация аудио для кластера 3 (Понимание/непонимание)...\n');

  // Найти кластер 3
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Understanding / Not Understanding')
    .single();

  if (clusterError || !cluster) {
    console.error('❌ Кластер не найден:', clusterError?.message);
    process.exit(1);
  }

  console.log(`✅ Кластер найден: ${cluster.name} (ID: ${cluster.id})\n`);

  // Загрузить фразы без аудио
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text, audio_url')
    .eq('cluster_id', cluster.id)
    .is('audio_url', null)
    .order('order_index', { ascending: true });

  if (phrasesError) {
    console.error('❌ Ошибка загрузки фраз:', phrasesError.message);
    process.exit(1);
  }

  if (!phrases || phrases.length === 0) {
    console.log('✅ Все фразы уже имеют аудио!');
    return;
  }

  console.log(`📝 Найдено фраз без аудио: ${phrases.length}\n`);

  const results = [];
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // Генерировать аудио для каждой фразы
  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    console.log(`[${i + 1}/${phrases.length}] ${phrase.portuguese_text.substring(0, 50)}...`);
    
    const result = await generateAudio(phrase);
    results.push(result);

    if (result.error) {
      errorCount++;
    } else if (result.skipped) {
      skippedCount++;
    } else {
      successCount++;
    }

    // Небольшая задержка между запросами
    if (i < phrases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n📊 Итоги:`);
  console.log(`   ✅ Успешно сгенерировано: ${successCount}`);
  console.log(`   ⏭️  Пропущено (уже существует): ${skippedCount}`);
  console.log(`   ❌ Ошибок: ${errorCount}`);
  console.log(`\n📁 Файлы сохранены в: ${OUTPUT_DIR}`);
  console.log(`\n📋 Следующий шаг: Загрузите файлы в Supabase Storage:`);
  console.log(`   node scripts/upload-audio-to-storage-service-key.js`);
}

main().catch(console.error);

