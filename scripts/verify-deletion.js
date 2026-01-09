/**
 * Verify that duplicate cluster was deleted
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

async function verify() {
  console.log('🔍 Проверка удаления дубля...\n');

  // Проверить, существует ли удаленный кластер
  const duplicateId = '6602fcf2-3d00-4cd3-899b-2537bce90e3c';
  const { data: deleted, error: deletedError } = await supabase
    .from('clusters')
    .select('id')
    .eq('id', duplicateId)
    .single();

  if (deletedError && deletedError.code === 'PGRST116') {
    console.log('✅ Дубль успешно удален (кластер не найден)\n');
  } else if (deleted) {
    console.log('⚠️  Дубль все еще существует!\n');
  } else {
    console.log('✅ Дубль удален\n');
  }

  // Проверить правильный кластер
  const { data: correct, error: correctError } = await supabase
    .from('clusters')
    .select('id, name, description, order_index')
    .eq('name', 'Profanity')
    .single();

  if (correctError) {
    console.error('❌ Ошибка:', correctError.message);
    return;
  }

  if (correct) {
    console.log('✅ Правильный кластер найден:');
    console.log(`   ID: ${correct.id}`);
    console.log(`   Название: ${correct.name}`);
    console.log(`   Описание: ${correct.description}`);
    console.log(`   Порядок: ${correct.order_index}\n`);
  }

  // Показать все кластеры с порядком 11
  const { data: order11 } = await supabase
    .from('clusters')
    .select('id, name, description, order_index')
    .eq('order_index', 11);

  console.log(`📊 Кластеры с порядком 11: ${order11?.length || 0}`);
  if (order11 && order11.length > 0) {
    order11.forEach(c => {
      console.log(`   - ${c.name} (ID: ${c.id})`);
    });
  }

  // Общее количество кластеров
  const { count } = await supabase
    .from('clusters')
    .select('*', { count: 'exact', head: true });

  console.log(`\n📊 Всего кластеров в базе: ${count}`);
}

verify().catch(console.error);







