/**
 * Import phrases from separate CSV files for "Shops and Services" cluster
 * Files: Слова.csv, Короткие предложения.csv, Длинные предложения.csv
 * 
 * Usage:
 * node scripts/import-shops-services-separate.js
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

const CATEGORIES_DIR = path.join(__dirname, '../Categories/7. Магазины и сервисы');

// Extract value from line (e.g., "PT: text" -> "text")
function extractValue(line, prefix) {
  if (!line || !line.trim()) return null;
  const trimmed = line.trim();
  if (trimmed.startsWith(prefix + ':')) {
    return trimmed.replace(new RegExp('^' + prefix + ':\\s*'), '').trim().replace(/^"|"$/g, '');
  }
  return null;
}

// Parse words CSV file
function parseWordsCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const words = [];
  let currentWord = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Empty line - save current word if exists
      if (currentWord && currentWord.portuguese) {
        words.push(currentWord);
        currentWord = null;
      }
      continue;
    }
    
    if (!currentWord) {
      currentWord = {
        portuguese: '',
        ipa: '',
        sentence: '',
        ru: '',
        en: '',
        ruSentence: '',
        enSentence: '',
      };
    }
    
    const pt = extractValue(line, 'PT');
    if (pt && !pt.includes('sentence')) {
      currentWord.portuguese = pt;
    } else if (pt && pt.includes('sentence')) {
      currentWord.sentence = extractValue(line, 'PT sentence') || '';
    }
    
    const ipa = extractValue(line, 'IPA');
    if (ipa) {
      currentWord.ipa = ipa;
    }
    
    const ru = extractValue(line, 'RU');
    if (ru && !ru.includes('sentence')) {
      currentWord.ru = ru;
    } else if (ru && ru.includes('sentence')) {
      currentWord.ruSentence = extractValue(line, 'RU sentence') || '';
    }
    
    const en = extractValue(line, 'EN');
    if (en && !en.includes('sentence')) {
      currentWord.en = en;
    } else if (en && en.includes('sentence')) {
      currentWord.enSentence = extractValue(line, 'EN sentence') || '';
    }
  }
  
  // Don't forget the last word
  if (currentWord && currentWord.portuguese) {
    words.push(currentWord);
  }
  
  return words;
}

// Parse sentences CSV file (short or long)
function parseSentencesCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const sentences = [];
  let currentSentence = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Empty line - save current sentence if exists
      if (currentSentence && currentSentence.portuguese) {
        sentences.push(currentSentence);
        currentSentence = null;
      }
      continue;
    }
    
    if (!currentSentence) {
      currentSentence = {
        portuguese: '',
        ipa: '',
        ru: '',
        en: '',
      };
    }
    
    const pt = extractValue(line, 'PT');
    if (pt) {
      currentSentence.portuguese = pt;
    }
    
    const ipa = extractValue(line, 'IPA');
    if (ipa) {
      currentSentence.ipa = ipa;
    }
    
    const ru = extractValue(line, 'RU');
    if (ru) {
      currentSentence.ru = ru;
    }
    
    const en = extractValue(line, 'EN');
    if (en) {
      currentSentence.en = en;
    }
  }
  
  // Don't forget the last sentence
  if (currentSentence && currentSentence.portuguese) {
    sentences.push(currentSentence);
  }
  
  return sentences;
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

// Check if phrase already exists
async function phraseExists(clusterId, portugueseText) {
  const { data, error } = await supabase
    .from('phrases')
    .select('id')
    .eq('cluster_id', clusterId)
    .eq('portuguese_text', portugueseText)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = not found
    console.error('⚠️  Error checking phrase existence:', error);
    return false;
  }

  return !!data;
}

// Import phrases with duplicate check
async function importPhrases(clusterId, phrases, phraseType) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phraseData = phrases[i];
    
    try {
      // Check if phrase already exists
      const exists = await phraseExists(clusterId, phraseData.portuguese);
      if (exists) {
        console.log(`   ⏭️  Skipped (exists): "${phraseData.portuguese.substring(0, 40)}..."`);
        skipped++;
        continue;
      }

      // Insert phrase
      const { data: phrase, error: phraseError } = await supabase
        .from('phrases')
        .insert({
          cluster_id: clusterId,
          portuguese_text: phraseData.portuguese,
          ipa_transcription: phraseData.ipa || null,
          phrase_type: phraseType,
          order_index: imported + skipped + 1,
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
      
      // For word type: save all translations separately
      if (phraseType === 'word') {
        // Save PT sentence (example usage)
        if (phraseData.sentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'pt-sentence',
            translation_text: phraseData.sentence,
          });
        }
        
        // Save RU sentence (translation of example)
        if (phraseData.ruSentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'ru-sentence',
            translation_text: phraseData.ruSentence,
          });
        }
        
        // Save EN sentence (translation of example)
        if (phraseData.enSentence) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'en-sentence',
            translation_text: phraseData.enSentence,
          });
        }
        
        // Save RU word translation
        if (phraseData.ru) {
          translations.push({
            phrase_id: phrase.id,
            language_code: 'ru',
            translation_text: phraseData.ru,
          });
        }
        
        // Save EN word translation
        if (phraseData.en) {
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
      
      if ((imported + skipped) % 10 === 0) {
        console.log(`   Progress: ${imported + skipped}/${phrases.length} processed (${imported} imported, ${skipped} skipped)...`);
      }
    } catch (error) {
      console.error(`❌ Error processing phrase ${i + 1}:`, error);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

// Main function
async function main() {
  try {
    console.log('📖 Reading CSV files...\n');
    
    // Parse words
    const wordsFile = path.join(CATEGORIES_DIR, 'Слова.csv');
    if (!fs.existsSync(wordsFile)) {
      console.error(`❌ File not found: ${wordsFile}`);
      process.exit(1);
    }
    const words = parseWordsCSV(wordsFile);
    console.log(`✅ Parsed Слова.csv: ${words.length} words`);

    // Parse short sentences
    const shortFile = path.join(CATEGORIES_DIR, 'Короткие предложения.csv');
    if (!fs.existsSync(shortFile)) {
      console.error(`❌ File not found: ${shortFile}`);
      process.exit(1);
    }
    const shortSentences = parseSentencesCSV(shortFile);
    console.log(`✅ Parsed Короткие предложения.csv: ${shortSentences.length} short sentences`);

    // Parse long sentences
    const longFile = path.join(CATEGORIES_DIR, 'Длинные предложения.csv');
    if (!fs.existsSync(longFile)) {
      console.error(`❌ File not found: ${longFile}`);
      process.exit(1);
    }
    const longSentences = parseSentencesCSV(longFile);
    console.log(`✅ Parsed Длинные предложения.csv: ${longSentences.length} long sentences`);

    console.log('\n🔍 Finding cluster...');
    const cluster = await getCluster();
    console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})`);

    console.log('\n📥 Importing phrases (skipping duplicates)...\n');
    
    // Import words
    if (words.length > 0) {
      console.log(`📝 Importing ${words.length} words...`);
      const result = await importPhrases(cluster.id, words, 'word');
      console.log(`✅ Words: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors\n`);
    }

    // Import short sentences
    if (shortSentences.length > 0) {
      console.log(`📝 Importing ${shortSentences.length} short sentences...`);
      const result = await importPhrases(cluster.id, shortSentences, 'short_sentence');
      console.log(`✅ Short sentences: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors\n`);
    }

    // Import long sentences
    if (longSentences.length > 0) {
      console.log(`📝 Importing ${longSentences.length} long sentences...`);
      const result = await importPhrases(cluster.id, longSentences, 'long_sentence');
      console.log(`✅ Long sentences: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors\n`);
    }

    console.log('✅ Import complete!');
    
  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

main();

