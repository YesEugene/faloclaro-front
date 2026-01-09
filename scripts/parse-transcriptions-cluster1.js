const fs = require('fs');
const path = require('path');

// Read transcriptions file
const transcriptionsFile = path.join(__dirname, '../Transcript/1. Реакции и ответы.rtf');
const jsonFile = path.join(__dirname, '../Clasters/1. Реакции и ответы.json');

// Convert RTF to text (simplified - you might need textutil on macOS)
const { execSync } = require('child_process');
let transcriptionsText;
try {
  transcriptionsText = execSync(`textutil -convert txt -stdout "${transcriptionsFile}"`, { encoding: 'utf8' });
} catch (error) {
  console.error('Error converting RTF:', error.message);
  process.exit(1);
}

// Parse transcriptions
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

console.log(`✅ Найдено транскрипций: ${Object.keys(transcriptions).length}\n`);

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

console.log(`✅ Фраз в JSON: ${jsonData.phrases.length}\n`);

// Generate SQL
const sqlStatements = [];
let matched = 0;
let notMatched = [];

jsonData.phrases.forEach((phrase, index) => {
  const pt = phrase.pt;
  const ipa = transcriptions[pt];
  
  if (ipa) {
    // Escape single quotes in IPA
    const escapedIpa = ipa.replace(/'/g, "''");
    const escapedPt = pt.replace(/'/g, "''");
    sqlStatements.push(`UPDATE phrases SET ipa_transcription = '${escapedIpa}' WHERE portuguese_text = '${escapedPt}';`);
    matched++;
  } else {
    notMatched.push({ index: index + 1, text: pt });
  }
});

console.log(`\n📊 Результаты:`);
console.log(`✅ Совпадений: ${matched}/${jsonData.phrases.length}`);
console.log(`❌ Не найдено: ${notMatched.length}\n`);

if (notMatched.length > 0) {
  console.log('❌ Фразы без транскрипций:');
  notMatched.forEach(item => {
    console.log(`  ${item.index}. ${item.text}`);
  });
  console.log('');
}

// Write SQL file
const sqlFile = path.join(__dirname, '../database/add-ipa-transcriptions-cluster1.sql');
const sqlContent = `-- Add IPA transcriptions for Cluster 1: Реакции и ответы
-- Generated automatically from transcriptions file
-- Total: ${matched}/${jsonData.phrases.length} phrases matched

${sqlStatements.join('\n')}
`;

fs.writeFileSync(sqlFile, sqlContent, 'utf8');
console.log(`✅ SQL файл создан: ${sqlFile}`);
console.log(`\n📝 Первые 5 SQL запросов:`);
console.log(sqlStatements.slice(0, 5).join('\n'));
if (sqlStatements.length > 5) {
  console.log('...');
}







