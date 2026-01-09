/**
 * Import phrases from CSV file for "Shops and Services" cluster
 * CSV has three columns: Слово (Word), Короткое предложение (Short sentence), Длинное предложение (Long sentence)
 * 
 * Usage:
 * node scripts/import-shops-services-csv-v2.js
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

// Parse CSV line handling quoted fields
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

// Extract value from cell (e.g., "PT: text" -> "text")
function extractValue(cell, prefix) {
  if (!cell || !cell.trim()) return null;
  if (cell.startsWith(prefix + ':')) {
    return cell.replace(new RegExp('^' + prefix + ':\\s*'), '').trim();
  }
  return null;
}

// Parse CSV file - each phrase group spans multiple rows
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  // Skip header (first 2 lines)
  const dataLines = lines.slice(2);
  
  const words = [];
  const shortSentences = [];
  const longSentences = [];
  
  let i = 0;
  while (i < dataLines.length) {
    // Each phrase group starts with a line containing PT: in one of the columns
    const line = dataLines[i];
    const columns = parseCSVLine(line);
    
    // Check column 0 for word
    if (columns[0] && extractValue(columns[0], 'PT')) {
      const wordData = parsePhraseGroup(dataLines, i, 0);
      if (wordData && wordData.portuguese) {
        words.push(wordData);
        // Skip processed lines (usually 5-7 lines per word)
        i += 6;
        continue;
      }
    }
    
    // Check column 1 for short sentence
    if (columns[1] && extractValue(columns[1], 'PT')) {
      const shortData = parsePhraseGroup(dataLines, i, 1);
      if (shortData && shortData.portuguese) {
        shortSentences.push(shortData);
        // Skip processed lines (usually 2-3 lines per short sentence)
        i += 2;
        continue;
      }
    }
    
    // Check column 2 for long sentence
    if (columns[2] && extractValue(columns[2], 'PT')) {
      const longData = parsePhraseGroup(dataLines, i, 2);
      if (longData && longData.portuguese) {
        longSentences.push(longData);
        // Skip processed lines (usually 2-3 lines per long sentence)
        i += 2;
        continue;
      }
    }
    
    i++;
  }
  
  return { words, shortSentences, longSentences };
}

// Parse a phrase group starting at startIndex in the specified column
function parsePhraseGroup(allLines, startIndex, columnIndex) {
  const data = {
    portuguese: '',
    ipa: '',
    sentence: '', // For words: sentence using the word
    ru: '',
    en: '',
    ruSentence: '',
    enSentence: '',
  };
  
  // Look through next 7 lines to find all related data
  for (let i = startIndex; i < Math.min(startIndex + 7, allLines.length); i++) {
    const line = allLines[i];
    const columns = parseCSVLine(line);
    const cell = columns[columnIndex] || '';
    
    if (cell.startsWith('PT:')) {
      data.portuguese = extractValue(cell, 'PT') || '';
    } else if (cell.startsWith('IPA:')) {
      data.ipa = extractValue(cell, 'IPA') || '';
    } else if (cell.startsWith('PT sentence:')) {
      data.sentence = extractValue(cell, 'PT sentence') || '';
    } else if (cell.startsWith('RU:')) {
      const ruValue = extractValue(cell, 'RU');
      if (ruValue && !data.ru) {
        data.ru = ruValue;
      }
    } else if (cell.startsWith('EN:')) {
      const enValue = extractValue(cell, 'EN');
      if (enValue && !data.en) {
        data.en = enValue;
      }
    } else if (cell.startsWith('RU sentence:')) {
      data.ruSentence = extractValue(cell, 'RU sentence') || '';
    } else if (cell.startsWith('EN sentence:')) {
      data.enSentence = extractValue(cell, 'EN sentence') || '';
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
      
      // For word type: use sentence translation if available, otherwise word translation
      if (phraseType === 'word') {
        if (phraseData.ruSentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'ru',
            translation_text: phraseData.ruSentence,
          });
        } else if (phraseData.ru) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'ru',
            translation_text: phraseData.ru,
          });
        }
        
        if (phraseData.enSentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'en',
            translation_text: phraseData.enSentence,
          });
        } else if (phraseData.en) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'en',
            translation_text: phraseData.en,
          });
        }
      } else {
        // For sentences: use direct translations
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

    // Debug: show first word
    if (words.length > 0) {
      console.log('\n📝 Sample word:', JSON.stringify(words[0], null, 2));
    }

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


