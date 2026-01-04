/**
 * Delete duplicate "Плохие слова / матерная речь" cluster
 * Keep the "Profanity" cluster (English name)
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

async function deleteDuplicate() {
  console.log('🗑️  Удаление дубля кластера "Плохие слова / матерная речь"...\n');

  // ID дубля (русское название)
  const duplicateId = '6602fcf2-3d00-4cd3-899b-2537bce90e3c';
  
  // Проверить, что это действительно дубль
  const { data: cluster, error: fetchError } = await supabase
    .from('clusters')
    .select('id, name, description, order_index')
    .eq('id', duplicateId)
    .single();

  if (fetchError || !cluster) {
    console.error('❌ Кластер не найден:', fetchError?.message);
    return;
  }

  console.log('📋 Кластер для удаления:');
  console.log(`   ID: ${cluster.id}`);
  console.log(`   Название: ${cluster.name}`);
  console.log(`   Описание: ${cluster.description}`);
  console.log(`   Порядок: ${cluster.order_index}\n`);

  // Проверить количество фраз
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id')
    .eq('cluster_id', duplicateId);

  if (phrasesError) {
    console.error('❌ Ошибка при проверке фраз:', phrasesError.message);
    return;
  }

  console.log(`⚠️  В этом кластере ${phrases?.length || 0} фраз`);
  console.log('   Фразы будут удалены вместе с кластером (CASCADE)\n');

  // Подтверждение
  console.log('🚨 ВНИМАНИЕ: Это удалит кластер и все его фразы!');
  console.log('   Удаляем дубль с русским названием...\n');

  // Удалить кластер (фразы удалятся автоматически из-за CASCADE)
  const { error: deleteError } = await supabase
    .from('clusters')
    .delete()
    .eq('id', duplicateId);

  if (deleteError) {
    console.error('❌ Ошибка при удалении:', deleteError.message);
    return;
  }

  console.log('✅ Кластер успешно удален!');
  console.log(`   Удалено фраз: ${phrases?.length || 0}\n`);

  // Проверить, что правильный кластер остался
  const { data: remaining } = await supabase
    .from('clusters')
    .select('id, name, description, order_index')
    .eq('name', 'Profanity')
    .single();

  if (remaining) {
    console.log('✅ Правильный кластер остался:');
    console.log(`   ID: ${remaining.id}`);
    console.log(`   Название: ${remaining.name}`);
    console.log(`   Описание: ${remaining.description}`);
  }
}

deleteDuplicate().catch(console.error);

