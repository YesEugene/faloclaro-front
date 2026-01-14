const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const transcriptionsDir = path.join(__dirname, '../Transcript');
const clustersDir = path.join(__dirname, '../Clasters');

// Mapping
const clusterMapping = {
  2: { transFile: '2. Вежливость и просьбы.rtf', jsonFile: '2. Вежливость и просьбы.json' },
  4: { transFile: '4. transcriptions_cluster_04_movement_time_pauses.rtf', jsonFile: '4. Движение, время, паузы.json' },
  5: { transFile: '5. transcriptions_cluster_05_home_daily_life.rtf', jsonFile: '5. Дом и быт.json' },
  6: { transFile: '6. transcriptions_cluster_06_children_school.rtf', jsonFile: '6. Дети и школа.json' },
};

function parseTranscriptions(rtfFilePath) {
  try {
    const transcriptionsText = execSync(`textutil -convert txt -stdout "${rtfFilePath}"`, { encoding: 'utf8' });
    const transcriptions = [];
    transcriptionsText.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && trimmed.includes(' | ')) {
        const [pt, ipa] = trimmed.split(' | ').map(s => s.trim());
        if (pt && ipa) {
          transcriptions.push({ pt, ipa });
        }
      }
    });
    return transcriptions;
  } catch (error) {
    console.error(`Ошибка:`, error.message);
    return [];
  }
}

console.log('🔍 ДЕТАЛЬНОЕ СРАВНЕНИЕ ПРОБЛЕМНЫХ КЛАСТЕРОВ\n');

for (const [clusterNum, files] of Object.entries(clusterMapping)) {
  const num = parseInt(clusterNum);
  const transFilePath = path.join(transcriptionsDir, files.transFile);
  const jsonFilePath = path.join(clustersDir, files.jsonFile);
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`КЛАСТЕР ${num}: ${files.jsonFile}`);
  console.log('='.repeat(60));
  
  if (!fs.existsSync(transFilePath) || !fs.existsSync(jsonFilePath)) {
    console.log('❌ Файлы не найдены\n');
    continue;
  }
  
  const transcriptions = parseTranscriptions(transFilePath);
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  const phrases = jsonData.phrases || [];
  
  console.log(`📊 Статистика:`);
  console.log(`   Фраз в JSON: ${phrases.length}`);
  console.log(`   Фраз в транскрипциях: ${transcriptions.length}\n`);
  
  // Создаем Set для быстрого поиска
  const transSet = new Set(transcriptions.map(t => t.pt));
  const jsonSet = new Set(phrases.map(p => p.pt));
  
  const matched = phrases.filter(p => transSet.has(p.pt));
  const notInTrans = phrases.filter(p => !transSet.has(p.pt));
  const notInJson = transcriptions.filter(t => !jsonSet.has(t.pt));
  
  console.log(`✅ Совпавших: ${matched.length}`);
  console.log(`❌ Есть в JSON, но нет в транскрипциях: ${notInTrans.length}`);
  console.log(`⚠️  Есть в транскрипциях, но нет в JSON: ${notInJson.length}\n`);
  
  if (notInTrans.length > 0 && notInTrans.length <= 10) {
    console.log(`📋 Первые фразы из JSON, которых нет в транскрипциях:`);
    notInTrans.slice(0, 10).forEach((phrase, i) => {
      console.log(`   ${i + 1}. ${phrase.pt}`);
    });
    console.log('');
  }
  
  if (notInJson.length > 0 && notInJson.length <= 10) {
    console.log(`📋 Первые фразы из транскрипций, которых нет в JSON:`);
    notInJson.slice(0, 10).forEach((trans, i) => {
      console.log(`   ${i + 1}. ${trans.pt}`);
    });
    console.log('');
  }
  
  // Проверяем похожие фразы (частичное совпадение)
  if (notInTrans.length > 0) {
    console.log(`🔍 Поиск похожих фраз (первые 5 несовпадений):\n`);
    notInTrans.slice(0, 5).forEach((phrase) => {
      const jsonWords = phrase.pt.toLowerCase().split(/\s+/).slice(0, 3); // Первые 3 слова
      const similar = transcriptions.filter(t => {
        const transWords = t.pt.toLowerCase().split(/\s+/).slice(0, 3);
        return jsonWords.some(word => transWords.includes(word));
      });
      
      if (similar.length > 0) {
        console.log(`   JSON: "${phrase.pt}"`);
        console.log(`   Похожие в транскрипциях:`);
        similar.slice(0, 3).forEach(s => {
          console.log(`      - "${s.pt}"`);
        });
        console.log('');
      }
    });
  }
}










