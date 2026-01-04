const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const transFile = path.join(__dirname, '../Transcript/3. transcriptions_cluster_03_understanding.rtf');
const jsonFile = path.join(__dirname, '../Clasters/3. Понимание : непонимание.json');

// Parse transcriptions
const transcriptionsText = execSync(`textutil -convert txt -stdout "${transFile}"`, { encoding: 'utf8' });
const transcriptions = {};
transcriptionsText.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && trimmed.includes(' | ')) {
    const [pt, ipa] = trimmed.split(' | ').map(s => s.trim());
    if (pt && ipa) transcriptions[pt] = ipa;
  }
});

// Read JSON
const jsonData = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

// Generate SQL
const sqlStatements = [];
let matched = 0;

jsonData.phrases.forEach(phrase => {
  const ipa = transcriptions[phrase.pt];
  if (ipa) {
    const escapedIpa = ipa.replace(/'/g, "''");
    const escapedPt = phrase.pt.replace(/'/g, "''");
    sqlStatements.push(`UPDATE phrases SET ipa_transcription = '${escapedIpa}' WHERE portuguese_text = '${escapedPt}';`);
    matched++;
  }
});

const sqlContent = `-- Add IPA transcriptions for Cluster 3: Понимание / непонимание
-- Total: ${matched}/${jsonData.phrases.length} phrases matched

${sqlStatements.join('\n')}
`;

const outputFile = path.join(__dirname, '../database/add-ipa-transcriptions-cluster3.sql');
fs.writeFileSync(outputFile, sqlContent, 'utf8');

console.log(`✅ SQL файл создан: ${outputFile}`);
console.log(`📊 Совпадений: ${matched}/${jsonData.phrases.length}`);

