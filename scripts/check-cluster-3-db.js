/**
 * Check if cluster 3 has phrases in database
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCluster3() {
  console.log('🔍 Проверка кластера 3 в базе данных...\n');

  // 1. Найти кластер 3
  console.log('1️⃣ Ищем кластер "Understanding / Not Understanding"...');
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('*')
    .eq('name', 'Understanding / Not Understanding')
    .single();

  if (clusterError || !cluster) {
    console.log('   ❌ Кластер не найден!');
    console.log('   Ошибка:', clusterError?.message);
    
    // Попробуем найти все кластеры
    console.log('\n   🔍 Ищем все кластеры с похожими именами...');
    const { data: allClusters } = await supabase
      .from('clusters')
      .select('id, name, description, order_index')
      .order('order_index', { ascending: true });
    
    if (allClusters) {
      console.log('   Найденные кластеры:');
      allClusters.forEach(c => {
        console.log(`      ${c.order_index}. ${c.name} (ID: ${c.id})`);
      });
    }
    return;
  }

  console.log(`   ✅ Кластер найден!`);
  console.log(`      ID: ${cluster.id}`);
  console.log(`      Name: ${cluster.name}`);
  console.log(`      Description: ${cluster.description}`);
  console.log(`      Order: ${cluster.order_index}\n`);

  // 2. Проверить фразы для этого кластера
  console.log('2️⃣ Ищем фразы для этого кластера...');
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text, order_index, audio_url, ipa_transcription')
    .eq('cluster_id', cluster.id)
    .order('order_index', { ascending: true });

  if (phrasesError) {
    console.log('   ❌ Ошибка при поиске фраз:', phrasesError.message);
    return;
  }

  console.log(`   ✅ Найдено фраз: ${phrases?.length || 0}\n`);

  if (!phrases || phrases.length === 0) {
    console.log('   ❌ ПРОБЛЕМА: Фразы не найдены в базе данных!');
    console.log('   💡 Решение: Запустите скрипт импорта:');
    console.log('      node scripts/import-clusters.js\n');
    return;
  }

  // 3. Показать первые 5 фраз
  console.log('3️⃣ Первые 5 фраз:');
  phrases.slice(0, 5).forEach((phrase, i) => {
    console.log(`   ${i + 1}. ${phrase.portuguese_text}`);
    console.log(`      IPA: ${phrase.ipa_transcription || 'не указана'}`);
    console.log(`      Audio: ${phrase.audio_url ? '✅' : '❌'}`);
  });

  // 4. Проверить переводы
  console.log('\n4️⃣ Проверяем переводы...');
  const phraseIds = phrases.map(p => p.id);
  const { data: translations } = await supabase
    .from('translations')
    .select('phrase_id, language_code, translation_text')
    .in('phrase_id', phraseIds.slice(0, 5)); // Проверяем первые 5

  console.log(`   Найдено переводов: ${translations?.length || 0}`);
  if (translations && translations.length > 0) {
    console.log('   Примеры переводов:');
    translations.slice(0, 3).forEach(t => {
      console.log(`      [${t.language_code}] ${t.translation_text.substring(0, 50)}...`);
    });
  }

  console.log('\n✅ Проверка завершена!');
  console.log(`\n📊 Итоги:`);
  console.log(`   - Кластер найден: ✅`);
  console.log(`   - Фраз в базе: ${phrases.length}`);
  console.log(`   - С аудио: ${phrases.filter(p => p.audio_url).length}`);
  console.log(`   - С IPA: ${phrases.filter(p => p.ipa_transcription).length}`);
}

checkCluster3().catch(console.error);









