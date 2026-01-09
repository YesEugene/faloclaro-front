/**
 * Check for duplicate clusters, especially "Плохие слова"
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

async function checkDuplicates() {
  console.log('🔍 Проверка дублей кластеров...\n');

  // Найти все кластеры с похожими названиями
  const { data: allClusters, error } = await supabase
    .from('clusters')
    .select('id, name, description, order_index')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('❌ Ошибка:', error.message);
    return;
  }

  console.log(`📊 Всего кластеров в базе: ${allClusters.length}\n`);

  // Ищем кластеры с "Плохие слова" или "Profanity"
  const profanityClusters = allClusters.filter(c => 
    c.name.toLowerCase().includes('profanity') || 
    c.description?.toLowerCase().includes('плохие') ||
    c.description?.toLowerCase().includes('матерная')
  );

  if (profanityClusters.length > 1) {
    console.log('⚠️  Найдены дубли кластера "Плохие слова":\n');
    
    for (const cluster of profanityClusters) {
      // Проверить количество фраз
      const { data: phrases } = await supabase
        .from('phrases')
        .select('id')
        .eq('cluster_id', cluster.id);
      
      console.log(`   Кластер ID: ${cluster.id}`);
      console.log(`   Название: ${cluster.name}`);
      console.log(`   Описание: ${cluster.description || 'нет'}`);
      console.log(`   Порядок: ${cluster.order_index}`);
      console.log(`   Фраз: ${phrases?.length || 0}`);
      console.log('');
    }
  } else if (profanityClusters.length === 1) {
    console.log('✅ Найден один кластер "Плохие слова":');
    console.log(`   ID: ${profanityClusters[0].id}`);
    console.log(`   Название: ${profanityClusters[0].name}`);
    console.log(`   Описание: ${profanityClusters[0].description}`);
  } else {
    console.log('❌ Кластер "Плохие слова" не найден');
  }

  // Показать все кластеры для проверки
  console.log('\n📋 Все кластеры в базе:');
  allClusters.forEach(c => {
    console.log(`   ${c.order_index}. ${c.name} (ID: ${c.id})`);
  });
}

checkDuplicates().catch(console.error);







