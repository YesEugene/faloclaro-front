/**
 * Upload audio files for cluster 3 to Supabase Storage
 * 
 * Usage:
 * node scripts/upload-audio-cluster3.js
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

function extractPhraseIdFromFilename(filename) {
  const match = filename.match(/^phrase-([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})-/);
  return match ? match[1] : null;
}

async function uploadFile(filePath, fileName) {
  const fileContent = fs.readFileSync(filePath);
  
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, fileContent, {
      contentType: 'audio/mpeg',
      upsert: true,
    });

  if (error) {
    console.error(`   ❌ Error: ${error.message}`);
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
    console.error(`   ⚠ Error updating: ${error.message}`);
    return false;
  }

  return true;
}

async function main() {
  console.log('📤 Загрузка аудио для кластера 3...\n');

  // Найти кластер 3
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Understanding / Not Understanding')
    .single();

  if (clusterError || !cluster) {
    console.error('❌ Кластер не найден');
    return;
  }

  // Получить все фразы кластера 3
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text')
    .eq('cluster_id', cluster.id)
    .order('order_index', { ascending: true });

  if (phrasesError || !phrases) {
    console.error('❌ Ошибка загрузки фраз');
    return;
  }

  console.log(`📝 Найдено фраз: ${phrases.length}\n`);

  // Найти соответствующие файлы
  const phraseIds = new Set(phrases.map(p => p.id));
  const files = fs.readdirSync(AUDIO_DIR)
    .filter(f => f.endsWith('.mp3'))
    .map(f => {
      const phraseId = extractPhraseIdFromFilename(f);
      return { filename: f, phraseId, path: path.join(AUDIO_DIR, f) };
    })
    .filter(f => f.phraseId && phraseIds.has(f.phraseId));

  console.log(`📁 Найдено файлов для загрузки: ${files.length}\n`);

  if (files.length === 0) {
    console.log('⚠️  Файлы не найдены. Убедитесь, что генерация завершена.');
    return;
  }

  let uploaded = 0;
  let updated = 0;
  let errors = 0;

  // Загрузить файлы
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const phrase = phrases.find(p => p.id === file.phraseId);
    
    console.log(`[${i + 1}/${files.length}] ${phrase?.portuguese_text.substring(0, 50)}...`);

    // Загрузить в Storage
    const uploadResult = await uploadFile(file.path, file.filename);
    
    if (!uploadResult.success) {
      errors++;
      continue;
    }

    uploaded++;

    // Обновить audio_url в базе
    const audioUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${file.filename}`;
    const updateResult = await updateAudioUrl(file.phraseId, audioUrl);
    
    if (updateResult) {
      updated++;
      console.log(`   ✅ Загружено и обновлено`);
    } else {
      console.log(`   ⚠ Загружено, но не обновлено в БД`);
    }

    // Небольшая задержка
    if (i < files.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n📊 Итоги:`);
  console.log(`   ✅ Загружено: ${uploaded}`);
  console.log(`   ✅ Обновлено в БД: ${updated}`);
  console.log(`   ❌ Ошибок: ${errors}`);
}

main().catch(console.error);









