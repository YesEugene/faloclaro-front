/**
 * Import short sentences from CSV file for "Cafes and Restaurants" cluster
 * File: Короткие предложения.csv
 * 
 * Usage:
 * node scripts/import-cafes-restaurants-short-sentences.js
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

const CATEGORIES_DIR = path.join(__dirname, '../Categories/8. Кафе и рестораны');

// Extract value from line (e.g., "PT: text" -> "text")
function extractValue(line, prefix) {
  if (!line || !line.trim()) return null;
  const trimmed = line.trim();
  if (trimmed.startsWith(prefix + ':')) {
    return trimmed.replace(new RegExp('^' + prefix + ':\\s*'), '').trim().replace(/^"|"$/g, '');
  }
  return null;
}

// Parse sentences CSV file
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
    .eq('name', 'Cafes and Restaurants')
    .single();

  if (error || !cluster) {
    console.error('❌ Cluster "Cafes and Restaurants" not found:', error);
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
async function importPhrases(clusterId, sentences) {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentenceData = sentences[i];
    
    try {
      // Check if phrase already exists
      const exists = await phraseExists(clusterId, sentenceData.portuguese);
      if (exists) {
        console.log(`   ⏭️  Skipped (exists): "${sentenceData.portuguese.substring(0, 40)}..."`);
        skipped++;
        continue;
      }

      // Insert phrase
      const { data: phrase, error: phraseError } = await supabase
        .from('phrases')
        .insert({
          cluster_id: clusterId,
          portuguese_text: sentenceData.portuguese,
          ipa_transcription: sentenceData.ipa || null,
          phrase_type: 'short_sentence',
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
      
      if (sentenceData.ru) {
        translations.push({
          phrase_id: phrase.id,
          language_code: 'ru',
          translation_text: sentenceData.ru,
        });
      }
      
      if (sentenceData.en) {
        translations.push({
          phrase_id: phrase.id,
          language_code: 'en',
          translation_text: sentenceData.en,
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
        console.log(`   Progress: ${imported + skipped}/${sentences.length} processed (${imported} imported, ${skipped} skipped)...`);
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
  console.log('🚀 Starting import for "Cafes and Restaurants" cluster (short sentences)...\n');

  // Get cluster
  console.log('🔍 Finding "Cafes and Restaurants" cluster...');
  const cluster = await getCluster();
  console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Parse sentences CSV
  const sentencesFilePath = path.join(CATEGORIES_DIR, 'Короткие предложения.csv');
  if (!fs.existsSync(sentencesFilePath)) {
    console.error(`❌ File not found: ${sentencesFilePath}`);
    process.exit(1);
  }

  console.log('📖 Parsing CSV file...');
  const sentences = parseSentencesCSV(sentencesFilePath);
  console.log(`✅ Parsed Короткие предложения.csv: ${sentences.length} sentences\n`);

  // Import sentences
  console.log('📥 Importing phrases (skipping duplicates)...');
  console.log(`📝 Importing ${sentences.length} short sentences...`);
  const result = await importPhrases(cluster.id, sentences);
  console.log(`✅ Short sentences: ${result.imported} imported, ${result.skipped} skipped, ${result.errors} errors\n`);

  console.log('✅ Import complete!');
}

main().catch(console.error);









