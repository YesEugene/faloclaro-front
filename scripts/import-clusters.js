/**
 * Import phrases from JSON cluster files
 * 
 * Usage:
 * node scripts/import-clusters.js
 * 
 * This script will:
 * 1. Read all JSON files from Clasters folder
 * 2. Create/update clusters in database
 * 3. Import phrases with translations
 * 4. Generate IPA transcriptions (placeholder - needs TTS API)
 * 5. Generate audio files (optional - requires Google Cloud TTS setup)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CLUSTERS_DIR = path.join(__dirname, '../Clasters');

// Map cluster names to English names (for database)
const clusterNameMap = {
  'Новичок : Beginner': 'Beginner',
  'Реакции и ответы': 'My take',
  'Вежливость и просьбы': 'Politeness and Requests',
  'Понимание : непонимание': 'Making sense',
  'Понимание / непонимание': 'Making sense', // Alternative format
  'Движение, время, паузы': 'Time and Path',
  'Дом и быт': 'Home and Daily Life',
  'Дети и школа': 'Children and School',
  'Магазины и сервисы': 'Shops and Services',
  'Кафе и рестораны': 'Cafes and Restaurants',
  'Эмоции и состояния': 'Emotions and States',
  'Связки речи': 'Speech Connectors',
  'Плохие слова : матерная речь': 'Conflict and Stress',
  'Плохие слова / матерная речь': 'Conflict and Stress', // Alternative format with slash
  'Фразы из фильмов': 'Cult Phrases',
};

async function getOrCreateCluster(clusterNameRu, clusterId) {
  const clusterNameEn = clusterNameMap[clusterNameRu] || clusterNameRu;
  
  // Try to find existing cluster
  const { data: existing } = await supabase
    .from('clusters')
    .select('id')
    .eq('name', clusterNameEn)
    .single();

  if (existing) {
    console.log(`   ✓ Cluster "${clusterNameEn}" exists (ID: ${existing.id})`);
    return existing.id;
  }

  // Create new cluster
  const { data, error } = await supabase
    .from('clusters')
    .insert({
      name: clusterNameEn,
      description: clusterNameRu,
      order_index: clusterId,
    })
    .select()
    .single();

  if (error) {
    console.error(`   ❌ Error creating cluster:`, error);
    return null;
  }

  console.log(`   ✓ Created cluster "${clusterNameEn}" (ID: ${data.id})`);
  return data.id;
}

async function importPhrases(clusterId, phrases, clusterName) {
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    
    try {
      // Check if phrase already exists
      const { data: existing } = await supabase
        .from('phrases')
        .select('id')
        .eq('cluster_id', clusterId)
        .eq('portuguese_text', phrase.pt)
        .single();

      let phraseId;

      // Support both formats: "ipa" or "ipa_transcription"
      const ipaText = phrase.ipa || phrase.ipa_transcription || null;
      
      // Support both formats: direct "en" or "translations" array
      let enText = phrase.en || null;
      if (!enText && phrase.translations && Array.isArray(phrase.translations)) {
        const enTranslation = phrase.translations.find(t => t.language_code === 'en');
        if (enTranslation) {
          enText = enTranslation.text || enTranslation.translation_text || null;
        }
      }

      if (existing) {
        // Update existing phrase
        const { data, error } = await supabase
          .from('phrases')
          .update({
            order_index: i + 1,
            ipa_transcription: ipaText,
            movie_title: phrase.movie?.title_pt || null,
            movie_character: phrase.movie?.character || null,
            movie_year: phrase.movie?.year || null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        phraseId = data.id;
        console.log(`   ↻ Updated: "${phrase.pt.substring(0, 40)}..."`);
      } else {
        // Insert new phrase
        const { data, error } = await supabase
          .from('phrases')
          .insert({
            cluster_id: clusterId,
            portuguese_text: phrase.pt,
            ipa_transcription: ipaText,
            audio_url: null, // Will be generated later
            order_index: i + 1,
            movie_title: phrase.movie?.title_pt || null,
            movie_character: phrase.movie?.character || null,
            movie_year: phrase.movie?.year || null,
          })
          .select()
          .single();

        if (error) throw error;
        phraseId = data.id;
        console.log(`   ✓ Added: "${phrase.pt.substring(0, 40)}..."`);
      }

      // Add/update Russian translation
      if (phrase.ru) {
        const { error: transError } = await supabase
          .from('translations')
          .upsert({
            phrase_id: phraseId,
            language_code: 'ru',
            translation_text: phrase.ru,
          }, {
            onConflict: 'phrase_id,language_code',
          });

        if (transError) {
          console.error(`     ⚠ Translation error (ru):`, transError.message);
        }
      }

      // Add/update English translation
      if (enText) {
        const { error: transError } = await supabase
          .from('translations')
          .upsert({
            phrase_id: phraseId,
            language_code: 'en',
            translation_text: enText,
          }, {
            onConflict: 'phrase_id,language_code',
          });

        if (transError) {
          console.error(`     ⚠ Translation error (en):`, transError.message);
        }
      }

      imported++;
    } catch (error) {
      console.error(`   ❌ Error importing phrase "${phrase.pt}":`, error.message);
      errors++;
    }
  }

  return { imported, errors };
}

async function importCluster(filePath) {
  const fileName = path.basename(filePath);
  console.log(`\n📁 Processing: ${fileName}`);

  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const clusterData = JSON.parse(fileContent);

    const clusterId = clusterData.cluster_id;
    const clusterNameRu = clusterData.cluster_name;
    const phrases = clusterData.phrases || [];

    if (phrases.length === 0) {
      console.log(`   ⚠ No phrases found in ${fileName}`);
      return;
    }

    // Get or create cluster
    const dbClusterId = await getOrCreateCluster(clusterNameRu, clusterId);
    if (!dbClusterId) {
      console.log(`   ❌ Skipping ${fileName} - cluster creation failed`);
      return;
    }

    // Import phrases
    console.log(`   📝 Importing ${phrases.length} phrases...`);
    const result = await importPhrases(dbClusterId, phrases, clusterNameRu);
    
    console.log(`   ✅ Imported: ${result.imported}, Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting cluster import...\n');

  // Check if clusters directory exists
  if (!fs.existsSync(CLUSTERS_DIR)) {
    console.error(`❌ Clusters directory not found: ${CLUSTERS_DIR}`);
    process.exit(1);
  }

  // Get all JSON files
  const files = fs.readdirSync(CLUSTERS_DIR)
    .filter(file => file.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${CLUSTERS_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} cluster files\n`);

  let totalImported = 0;
  let totalErrors = 0;

  // Import each cluster
  for (const file of files) {
    const filePath = path.join(CLUSTERS_DIR, file);
    const result = await importCluster(filePath);
    
    if (result) {
      totalImported += result.imported;
      totalErrors += result.errors;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Total phrases imported: ${totalImported}`);
  console.log(`   Total errors: ${totalErrors}`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Generate IPA transcriptions (optional)`);
  console.log(`   2. Generate audio files (optional)`);
  console.log(`   3. Update audio_url in database`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importCluster, importPhrases };

