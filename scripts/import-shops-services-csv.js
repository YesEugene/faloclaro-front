/**
 * Import phrases from CSV file for "Shops and Services" cluster
 * CSV has three columns: Слово (Word), Короткое предложение (Short sentence), Длинное предложение (Long sentence)
 * 
 * Usage:
 * node scripts/import-shops-services-csv.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CSV_FILE = path.join(__dirname, '../Categories/7. Магазины и сервисы.csv');

// Parse CSV line
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  
  return result;
}

// Parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header
  const dataLines = lines.slice(1);
  
  const words = [];
  const shortSentences = [];
  const longSentences = [];
  
  let i = 0;
  while (i < dataLines.length) {
    const line = dataLines[i];
    const columns = parseCSVLine(line);
    
    // Column 0: Word
    if (columns[0] && columns[0].trim() && columns[0].startsWith('PT:')) {
      const wordData = parsePhraseData(dataLines, i, 0);
      if (wordData && wordData.portuguese) {
        words.push(wordData);
        // Skip lines we've already processed for this word
        i += 6; // Usually 6-7 lines per phrase
        continue;
      }
    }
    
    // Column 1: Short sentence
    if (columns[1] && columns[1].trim() && columns[1].startsWith('PT:')) {
      const shortData = parsePhraseData(dataLines, i, 1);
      if (shortData && shortData.portuguese) {
        shortSentences.push(shortData);
        // Skip lines we've already processed
        i += 3; // Usually 3-4 lines per short sentence
        continue;
      }
    }
    
    // Column 2: Long sentence
    if (columns[2] && columns[2].trim() && columns[2].startsWith('PT:')) {
      const longData = parsePhraseData(dataLines, i, 2);
      if (longData && longData.portuguese) {
        longSentences.push(longData);
        // Skip lines we've already processed
        i += 3; // Usually 3-4 lines per long sentence
        continue;
      }
    }
    
    i++;
  }
  
  return { words, shortSentences, longSentences };
}

// Parse phrase data from CSV - each phrase spans multiple rows
function parsePhraseData(allLines, startIndex, columnIndex) {
  const data = {
    portuguese: '',
    ipa: '',
    sentence: '', // For words: sentence using the word
    ru: '',
    en: '',
    ruSentence: '',
    enSentence: '',
  };
  
  // Look through next few lines to find all related data
  for (let i = startIndex; i < Math.min(startIndex + 7, allLines.length); i++) {
    const line = allLines[i];
    const columns = parseCSVLine(line);
    const cell = columns[columnIndex] || '';
    
    if (cell.startsWith('PT:')) {
      data.portuguese = cell.replace(/^PT:\s*/, '').trim();
    } else if (cell.startsWith('IPA:')) {
      data.ipa = cell.replace(/^IPA:\s*/, '').trim();
    } else if (cell.startsWith('PT sentence:')) {
      data.sentence = cell.replace(/^PT sentence:\s*/, '').trim();
    } else if (cell.startsWith('RU:')) {
      data.ru = cell.replace(/^RU:\s*/, '').trim();
    } else if (cell.startsWith('EN:')) {
      data.en = cell.replace(/^EN:\s*/, '').trim();
    } else if (cell.startsWith('RU sentence:')) {
      data.ruSentence = cell.replace(/^RU sentence:\s*/, '').trim();
    } else if (cell.startsWith('EN sentence:')) {
      data.enSentence = cell.replace(/^EN sentence:\s*/, '').trim();
    }
  }
  
  // Only return if we have Portuguese text
  if (!data.portuguese) {
    return null;
  }
  
  return data;
}

// Get or find cluster
async function getCluster() {
  const { data: cluster, error } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Shops and Services')
    .single();

  if (error || !cluster) {
    console.error('❌ Cluster "Shops and Services" not found:', error);
    process.exit(1);
  }

  return cluster;
}

// Import phrases
async function importPhrases(clusterId, phrases, phraseType) {
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phraseData = phrases[i];
    
    try {
      // Insert phrase
      const { data: phrase, error: phraseError } = await supabase
        .from('phrases')
        .insert({
          cluster_id: clusterId,
          portuguese_text: phraseData.portuguese,
          ipa_transcription: phraseData.ipa || null,
          phrase_type: phraseType,
          order_index: i + 1,
        })
        .select()
        .single();

      if (phraseError) {
        console.error(`❌ Error inserting phrase ${i + 1}:`, phraseError);
        errors++;
        continue;
      }

      // Insert translations
      const translations = [];
      
      if (phraseData.ru) {
        translations.push({
          phrase_id: phrase.id,
          language_code: 'ru',
          translation_text: phraseData.ru,
        });
      }
      
      if (phraseData.en) {
        translations.push({
          phrase_id: phrase.id,
          language_code: 'en',
          translation_text: phraseData.en,
        });
      }

      // For word type, also add sentence translations
      if (phraseType === 'word' && phraseData.sentence) {
        // Store sentence in translation field for word type
        if (phraseData.ruSentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'ru',
            translation_text: phraseData.ruSentence,
          });
        }
        if (phraseData.enSentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'en',
            translation_text: phraseData.enSentence,
          });
        }
      }

      if (translations.length > 0) {
        const { error: transError } = await supabase
          .from('translations')
          .insert(translations);

        if (transError) {
          console.error(`⚠️  Error inserting translations for phrase ${i + 1}:`, transError);
        }
      }

      imported++;
      
      if ((i + 1) % 10 === 0) {
        console.log(`   Imported ${i + 1}/${phrases.length} ${phraseType} phrases...`);
      }
    } catch (error) {
      console.error(`❌ Error processing phrase ${i + 1}:`, error);
      errors++;
    }
  }

  return { imported, errors };
}

// Main function
async function main() {
  try {
    console.log('📖 Reading CSV file...');
    
    if (!fs.existsSync(CSV_FILE)) {
      console.error(`❌ CSV file not found: ${CSV_FILE}`);
      process.exit(1);
    }

    const { words, shortSentences, longSentences } = parseCSV(CSV_FILE);
    
    console.log(`✅ Parsed CSV:`);
    console.log(`   - Words: ${words.length}`);
    console.log(`   - Short sentences: ${shortSentences.length}`);
    console.log(`   - Long sentences: ${longSentences.length}`);

    console.log('\n🔍 Finding cluster...');
    const cluster = await getCluster();
    console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})`);

    console.log('\n📥 Importing phrases...');
    
    // Import words
    if (words.length > 0) {
      console.log(`\n📝 Importing ${words.length} words...`);
      const result = await importPhrases(cluster.id, words, 'word');
      console.log(`✅ Words: ${result.imported} imported, ${result.errors} errors`);
    }

    // Import short sentences
    if (shortSentences.length > 0) {
      console.log(`\n📝 Importing ${shortSentences.length} short sentences...`);
      const result = await importPhrases(cluster.id, shortSentences, 'short_sentence');
      console.log(`✅ Short sentences: ${result.imported} imported, ${result.errors} errors`);
    }

    // Import long sentences
    if (longSentences.length > 0) {
      console.log(`\n📝 Importing ${longSentences.length} long sentences...`);
      const result = await importPhrases(cluster.id, longSentences, 'long_sentence');
      console.log(`✅ Long sentences: ${result.imported} imported, ${result.errors} errors`);
    }

    console.log('\n✅ Import complete!');
    
  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

main();

