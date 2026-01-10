/**
 * Merge new phrases into Beginner cluster
 */

const fs = require('fs');
const path = require('path');

const CLUSTERS_DIR = path.join(__dirname, '../Clasters');

// Find all Beginner files
const files = fs.readdirSync(CLUSTERS_DIR).filter(f => 
  f.toLowerCase().includes('beginner') || f.includes('новичок')
);

console.log('Found files:', files);

if (files.length < 2) {
  console.error('❌ Need at least 2 Beginner files to merge');
  process.exit(1);
}

// Read main file
const mainFile = files.find(f => !f.includes('копия') && !f.includes('часть'));
const secondFile = files.find(f => f.includes('копия') || f.includes('часть'));

if (!mainFile || !secondFile) {
  console.error('❌ Could not identify main and second files');
  console.error('Main file should not contain "копия" or "часть"');
  process.exit(1);
}

console.log('Main file:', mainFile);
console.log('Second file:', secondFile);

const mainData = JSON.parse(fs.readFileSync(path.join(CLUSTERS_DIR, mainFile), 'utf8'));
const secondData = JSON.parse(fs.readFileSync(path.join(CLUSTERS_DIR, secondFile), 'utf8'));

console.log(`Main file phrases: ${mainData.phrases.length}`);
console.log(`Second file phrases: ${secondData.phrases.length}`);

// Merge phrases
const mergedPhrases = [...mainData.phrases, ...secondData.phrases];

const mergedData = {
  ...mainData,
  phrases: mergedPhrases
};

// Write merged file
fs.writeFileSync(
  path.join(CLUSTERS_DIR, mainFile),
  JSON.stringify(mergedData, null, 2)
);

console.log(`✅ Merged: ${mergedPhrases.length} phrases total`);








