/**
 * Check if cluster 3 has audio files
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAudio() {
  console.log('🔍 Проверка аудио для кластера 3...\n');

  // Найти кластер 3
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Understanding / Not Understanding')
    .single();

  if (clusterError || !cluster) {
    console.error('❌ Кластер не найден:', clusterError?.message);
    return;
  }

  console.log(`✅ Кластер найден: ${cluster.name} (ID: ${cluster.id})\n`);

  // Проверить фразы
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text, audio_url')
    .eq('cluster_id', cluster.id)
    .order('order_index', { ascending: true });

  if (phrasesError) {
    console.error('❌ Ошибка:', phrasesError.message);
    return;
  }

  console.log(`📊 Всего фраз: ${phrases?.length || 0}\n`);

  const withAudio = phrases?.filter(p => p.audio_url) || [];
  const withoutAudio = phrases?.filter(p => !p.audio_url) || [];

  console.log(`✅ С аудио: ${withAudio.length}`);
  console.log(`❌ Без аудио: ${withoutAudio.length}\n`);

  if (withoutAudio.length > 0) {
    console.log('📋 Первые 10 фраз без аудио:');
    withoutAudio.slice(0, 10).forEach((phrase, i) => {
      console.log(`   ${i + 1}. ${phrase.portuguese_text}`);
    });
    if (withoutAudio.length > 10) {
      console.log(`   ... и еще ${withoutAudio.length - 10} фраз`);
    }
  }

  if (withAudio.length > 0) {
    console.log('\n✅ Примеры фраз с аудио:');
    withAudio.slice(0, 3).forEach((phrase, i) => {
      console.log(`   ${i + 1}. ${phrase.portuguese_text}`);
      console.log(`      Audio: ${phrase.audio_url}`);
    });
  }
}

checkAudio().catch(console.error);










