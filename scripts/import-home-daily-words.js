/**
 * Import words from CSV file for "Home and Daily Life" cluster
 * File: Слова.csv
 * 
 * Usage:
 * node scripts/import-home-daily-words.js
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

const CATEGORIES_DIR = path.join(__dirname, '../Categories/6. Дом и повседневная жизнь');

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
  const lines = content.split('\n').map(line => line.trim()).filter(Boolean); // Filter out empty lines
  
  const words = [];
  let currentWord = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // New word starts with "PT: " (without "sentence")
    if (line.startsWith('PT: ') && !line.includes('sentence')) {
      // Save previous word if exists
      if (currentWord && currentWord.portuguese) {
        words.push(currentWord);
      }
      // Start new word
      currentWord = {
        portuguese: extractValue(line, 'PT'),
        ipa: '',
        sentence: '',
        ru: '',
        en: '',
        ruSentence: '',
        enSentence: '',
      };
    } else if (currentWord) {
      // Continue parsing current word
      const ipa = extractValue(line, 'IPA');
      if (ipa) {
        currentWord.ipa = ipa;
      }
      
      const ptSentence = extractValue(line, 'PT sentence');
      if (ptSentence) {
        currentWord.sentence = ptSentence;
      }
      
      const ruSentence = extractValue(line, 'RU sentence');
      if (ruSentence) {
        currentWord.ruSentence = ruSentence;
      }
      
      const enSentence = extractValue(line, 'EN sentence');
      if (enSentence) {
        currentWord.enSentence = enSentence;
      }
      
      // RU word (not sentence)
      const ruWord = extractValue(line, 'RU');
      if (ruWord && !line.includes('sentence')) {
        currentWord.ru = ruWord;
      }
      
      // EN word (not sentence)
      const enWord = extractValue(line, 'EN');
      if (enWord && !line.includes('sentence')) {
        currentWord.en = enWord;
      }
    }
  }
  
  // Don't forget the last word
  if (currentWord && currentWord.portuguese) {
    words.push(currentWord);
  }
  
  return words;
}

// Get or find cluster
async function getCluster() {
  const { data: cluster, error } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Home and Daily Life')
    .single();

  if (error || !cluster) {
    console.error('❌ Cluster "Home and Daily Life" not found:', error);
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
async function importPhrases(clusterId, phrases) {
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
          phrase_type: 'word',
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

      if (translations.length > 0) {
        const { error: transError } = await supabase
          .from('translations')
          .insert(translations);

        if (transError) {
          console.error(`❌ Error inserting translations for phrase ${i + 1}:`, transError);
          errors++;
          continue;
        }
      }

      imported++;
      if ((imported + skipped) % 10 === 0) {
        console.log(`   Progress: ${imported + skipped}/${phrases.length} processed (${imported} imported, ${skipped} skipped)...`);
      }
    } catch (error) {
      console.error(`❌ Unexpected error processing phrase ${i + 1}:`, error);
      errors++;
    }
  }

  return { imported, skipped, errors };
}

// Main function
async function main() {
  console.log('🚀 Starting import for "Home and Daily Life" cluster...\n');

  // Get cluster
  console.log('🔍 Finding "Home and Daily Life" cluster...');
  const cluster = await getCluster();
  console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Parse words CSV
  const wordsFilePath = path.join(CATEGORIES_DIR, 'Слова.csv');
  if (!fs.existsSync(wordsFilePath)) {
    console.error(`❌ File not found: ${wordsFilePath}`);
    process.exit(1);
  }

  console.log('📖 Parsing CSV files...');
  const words = parseWordsCSV(wordsFilePath);
  console.log(`✅ Parsed Слова.csv: ${words.length} words\n`);

  // Import words
  console.log('📥 Importing phrases (skipping duplicates)...');
  console.log(`📝 Importing ${words.length} words...`);
  const wordsResult = await importPhrases(cluster.id, words);
  console.log(`✅ Words: ${wordsResult.imported} imported, ${wordsResult.skipped} skipped, ${wordsResult.errors} errors\n`);

  console.log('✅ Import complete!');
}

main().catch(console.error);








