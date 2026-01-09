const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Mapping: cluster number -> { transcription file, json file }
const clusterMapping = {
  1: { transFile: '1. Реакции и ответы.rtf', jsonFile: '1. Реакции и ответы.json' },
  2: { transFile: '2. Вежливость и просьбы.rtf', jsonFile: '2. Вежливость и просьбы.json' },
  3: { transFile: '3. transcriptions_cluster_03_understanding.rtf', jsonFile: '3. Понимание : непонимание.json' },
  4: { transFile: '4. transcriptions_cluster_04_movement_time_pauses.rtf', jsonFile: '4. Движение, время, паузы.json' },
  5: { transFile: '5. transcriptions_cluster_05_home_daily_life.rtf', jsonFile: '5. Дом и быт.json' },
  6: { transFile: '6. transcriptions_cluster_06_children_school.rtf', jsonFile: '6. Дети и школа.json' },
  7: { transFile: '7. transcriptions_cluster_07_shops_services.rtf', jsonFile: '7. Магазины и сервисы.json' },
  8: { transFile: '8. transcriptions_cluster_08_cafe_restaurants.rtf', jsonFile: '8. Кафе и рестораны.json' },
  9: { transFile: '9. transcriptions_cluster_09_emotions_states.rtf', jsonFile: '9. Эмоции и состояния.json' },
  10: { transFile: '10. transcriptions_cluster_10_connectors.rtf', jsonFile: '10. Связки речи.json' },
  11: { transFile: '11. transcriptions_cluster_11_explicit.rtf', jsonFile: '11. Плохие слова : матерная речь.json' },
  12: { transFile: '12. transcriptions_cluster_12_movie_quotes.rtf', jsonFile: '12. Фразы из фильмов.json' },
};

const transcriptionsDir = path.join(__dirname, '../Transcript');
const clustersDir = path.join(__dirname, '../Clasters');
const outputDir = path.join(__dirname, '../database');

// Helper function to escape SQL strings
function escapeSql(str) {
  return str.replace(/'/g, "''");
}

// Parse transcriptions from RTF file
function parseTranscriptions(rtfFilePath) {
  try {
    const transcriptionsText = execSync(`textutil -convert txt -stdout "${rtfFilePath}"`, { encoding: 'utf8' });
    const transcriptions = {};
    
    transcriptionsText.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes(' | ')) {
        const [pt, ipa] = trimmed.split(' | ').map(s => s.trim());
        if (pt && ipa) {
          transcriptions[pt] = ipa;
        }
      }
    });
    
    return transcriptions;
  } catch (error) {
    console.error(`❌ Ошибка при конвертации ${rtfFilePath}:`, error.message);
    return null;
  }
}

// Process all clusters
const allSqlStatements = [];
let totalMatched = 0;
let totalPhrases = 0;
const clusterResults = [];

console.log('🔄 Начинаю обработку всех кластеров...\n');

for (const [clusterNum, files] of Object.entries(clusterMapping)) {
  const num = parseInt(clusterNum);
  const transFilePath = path.join(transcriptionsDir, files.transFile);
  const jsonFilePath = path.join(clustersDir, files.jsonFile);
  
  // Check if files exist
  if (!fs.existsSync(transFilePath)) {
    console.log(`⚠️  Кластер ${num}: Файл транскрипций не найден: ${files.transFile}`);
    continue;
  }
  
  if (!fs.existsSync(jsonFilePath)) {
    console.log(`⚠️  Кластер ${num}: JSON файл не найден: ${files.jsonFile}`);
    continue;
  }
  
  console.log(`📝 Обработка кластера ${num}...`);
  
  // Parse transcriptions
  const transcriptions = parseTranscriptions(transFilePath);
  if (!transcriptions) {
    console.log(`❌ Кластер ${num}: Не удалось распарсить транскрипции\n`);
    continue;
  }
  
  // Read JSON
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  const phrases = jsonData.phrases || [];
  
  // Generate SQL for this cluster
  const sqlStatements = [];
  let matched = 0;
  let notMatched = [];
  
  phrases.forEach((phrase, index) => {
    const pt = phrase.pt;
    const ipa = transcriptions[pt];
    
    if (ipa) {
      const escapedIpa = escapeSql(ipa);
      const escapedPt = escapeSql(pt);
      sqlStatements.push(`UPDATE phrases SET ipa_transcription = '${escapedIpa}' WHERE portuguese_text = '${escapedPt}';`);
      matched++;
    } else {
      notMatched.push({ index: index + 1, text: pt });
    }
  });
  
  totalMatched += matched;
  totalPhrases += phrases.length;
  
  const result = {
    clusterNum: num,
    clusterName: jsonData.cluster_name || `Cluster ${num}`,
    matched,
    total: phrases.length,
    notMatched,
    sqlStatements,
  };
  
  clusterResults.push(result);
  
  console.log(`   ✅ Совпадений: ${matched}/${phrases.length}`);
  if (notMatched.length > 0) {
    console.log(`   ⚠️  Не найдено: ${notMatched.length}`);
  }
  console.log('');
  
  allSqlStatements.push(...sqlStatements);
}

// Generate combined SQL file
const sqlHeader = `-- Add IPA transcriptions for all clusters
-- Generated automatically from transcription files
-- Total: ${totalMatched}/${totalPhrases} phrases matched across ${clusterResults.length} clusters
-- Generated: ${new Date().toISOString()}

`;

const sqlContent = sqlHeader + allSqlStatements.join('\n') + '\n';

const sqlFile = path.join(outputDir, 'add-ipa-transcriptions-all.sql');
fs.writeFileSync(sqlFile, sqlContent, 'utf8');

// Generate summary
console.log('📊 ИТОГОВАЯ СТАТИСТИКА:\n');
console.log(`✅ Всего кластеров обработано: ${clusterResults.length}`);
console.log(`✅ Всего фраз совпало: ${totalMatched}/${totalPhrases}`);
console.log(`✅ SQL файл создан: ${sqlFile}\n`);

// Show details for each cluster
console.log('📋 Детали по кластерам:\n');
clusterResults.forEach(result => {
  const status = result.matched === result.total ? '✅' : '⚠️';
  console.log(`${status} Кластер ${result.clusterNum} (${result.clusterName}): ${result.matched}/${result.total}`);
  
  if (result.notMatched.length > 0 && result.notMatched.length <= 5) {
    console.log(`   Не найдено:`);
    result.notMatched.forEach(item => {
      console.log(`     ${item.index}. ${item.text}`);
    });
  } else if (result.notMatched.length > 5) {
    console.log(`   Не найдено: ${result.notMatched.length} фраз`);
  }
});

console.log(`\n✅ Готово! SQL файл: ${sqlFile}`);



