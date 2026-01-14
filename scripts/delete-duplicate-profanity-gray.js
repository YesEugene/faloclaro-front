/**
 * Delete duplicate "Плохие слова / матерная речь" cluster (gray one)
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role key to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteDuplicate() {
  console.log('🗑️  Удаление дубля кластера "Плохие слова / матерная речь" (серый)...\n');

  // ID дубля (русское название, серый цвет)
  const duplicateId = 'ddeac0c5-3a87-4fab-9c36-2e59ac027ef9';
  
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

  // Удалить кластер (фразы удалятся автоматически из-за CASCADE)
  const { error: deleteError } = await supabase
    .from('clusters')
    .delete()
    .eq('id', duplicateId);

  if (deleteError) {
    console.error('❌ Ошибка при удалении:', deleteError.message);
    console.error('   Детали:', JSON.stringify(deleteError, null, 2));
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

  // Проверить, что дубль действительно удален
  const { data: checkDeleted } = await supabase
    .from('clusters')
    .select('id')
    .eq('id', duplicateId)
    .single();

  if (checkDeleted) {
    console.log('\n⚠️  ВНИМАНИЕ: Кластер все еще существует!');
  } else {
    console.log('\n✅ Подтверждено: дубль полностью удален');
  }
}

deleteDuplicate().catch(console.error);










