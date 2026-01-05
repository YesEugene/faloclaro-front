/**
 * Full clean and re-import all clusters and phrases from Clasters folder
 * 
 * Usage:
 * node scripts/full-clean-and-import.js
 * 
 * This will:
 * 1. Delete ALL clusters (CASCADE will delete all phrases and translations)
 * 2. Re-import all clusters and phrases from Clasters folder
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
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
  'Реакции и ответы': 'Reactions and Responses',
  'Вежливость и просьбы': 'Politeness and Requests',
  'Понимание : непонимание': 'Understanding / Not Understanding',
  'Движение, время, паузы': 'Movement, Time, Pauses',
  'Дом и быт': 'Home and Daily Life',
  'Дети и школа': 'Children and School',
  'Магазины и сервисы': 'Shops and Services',
  'Кафе и рестораны': 'Cafes and Restaurants',
  'Эмоции и состояния': 'Emotions and States',
  'Связки речи': 'Speech Connectors',
  'Плохие слова : матерная речь': 'Profanity',
  'Фразы из фильмов': 'Movie Quotes',
};

async function cleanAll() {
  console.log('🧹 Cleaning ALL clusters, phrases, and translations...\n');

  // Delete all clusters (CASCADE will automatically delete all phrases and translations)
  const { error } = await supabase
    .from('clusters')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (error) {
    console.error('❌ Error cleaning database:', error);
    return false;
  }

  console.log('✅ All clusters deleted (phrases and translations deleted via CASCADE)\n');
  return true;
}

async function createCluster(clusterNameRu, clusterId) {
  const clusterNameEn = clusterNameMap[clusterNameRu] || clusterNameRu;
  
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

async function importPhrases(clusterId, phrases) {
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    
    try {
      // Insert new phrase
      const { data, error } = await supabase
        .from('phrases')
        .insert({
          cluster_id: clusterId,
          portuguese_text: phrase.pt,
          ipa_transcription: null,
          audio_url: null,
          order_index: i + 1,
          movie_title: phrase.movie?.title_pt || null,
          movie_character: phrase.movie?.character || null,
          movie_year: phrase.movie?.year || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Add translation
      if (phrase.ru) {
        const { error: transError } = await supabase
          .from('translations')
          .insert({
            phrase_id: data.id,
            language_code: 'ru',
            translation_text: phrase.ru,
          });

        if (transError) {
          console.error(`     ⚠ Translation error:`, transError.message);
        }
      }

      imported++;
      if ((i + 1) % 10 === 0) {
        process.stdout.write(`   ${i + 1}/${phrases.length}... `);
      }
    } catch (error) {
      console.error(`   ❌ Error importing phrase "${phrase.pt.substring(0, 40)}...":`, error.message);
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
      console.log(`   ⚠ No phrases found`);
      return;
    }

    // Create cluster
    const dbClusterId = await createCluster(clusterNameRu, clusterId);
    if (!dbClusterId) {
      console.log(`   ❌ Skipping ${fileName} - cluster creation failed`);
      return;
    }

    // Import phrases
    console.log(`   📝 Importing ${phrases.length} phrases...`);
    const result = await importPhrases(dbClusterId, phrases);
    
    console.log(`\n   ✅ Imported: ${result.imported}, Errors: ${result.errors}`);

    return result;
  } catch (error) {
    console.error(`   ❌ Error processing ${fileName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Full clean and import process...\n');

  // Step 1: Clean everything
  const cleaned = await cleanAll();
  if (!cleaned) {
    console.error('❌ Failed to clean database');
    process.exit(1);
  }

  // Step 2: Check clusters directory
  if (!fs.existsSync(CLUSTERS_DIR)) {
    console.error(`❌ Clusters directory not found: ${CLUSTERS_DIR}`);
    process.exit(1);
  }

  // Step 3: Get all JSON files
  const files = fs.readdirSync(CLUSTERS_DIR)
    .filter(file => file.endsWith('.json'))
    .sort((a, b) => {
      // Sort by number at the start of filename
      const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
      const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
      return numA - numB;
    });

  if (files.length === 0) {
    console.error(`❌ No JSON files found in ${CLUSTERS_DIR}`);
    process.exit(1);
  }

  console.log(`Found ${files.length} cluster files\n`);

  // Step 4: Import each cluster
  let totalImported = 0;
  let totalErrors = 0;

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
  console.log(`   1. Check the app - all clusters should be visible`);
  console.log(`   2. Generate IPA transcriptions (optional)`);
  console.log(`   3. Generate audio files (optional)`);
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanAll, importCluster };


