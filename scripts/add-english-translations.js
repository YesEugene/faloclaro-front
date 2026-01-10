/**
 * Add English translations to phrases
 * 
 * This script will:
 * 1. Find all phrases that have Russian translations but no English translations
 * 2. Use Google Translate API to translate from Portuguese to English
 * 3. Add English translations to the database
 * 
 * Usage:
 * export GOOGLE_APPLICATION_CREDENTIALS="./google-credentials.json"
 * node scripts/add-english-translations.js
 */

const { createClient } = require('@supabase/supabase-js');
const { Translate } = require('@google-cloud/translate').v2;
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Google Translate
let translate;
try {
  translate = new Translate({
    keyFilename: path.join(__dirname, '../google-credentials.json'),
  });
} catch (error) {
  console.error('❌ Error initializing Google Translate:', error.message);
  console.error('   Make sure GOOGLE_APPLICATION_CREDENTIALS is set or google-credentials.json exists');
  process.exit(1);
}

async function translateText(text, targetLanguage = 'en') {
  try {
    const [translation] = await translate.translate(text, targetLanguage);
    return translation;
  } catch (error) {
    console.error(`   ⚠ Error translating: ${error.message}`);
    return null;
  }
}

async function addEnglishTranslations() {
  console.log('🌐 Adding English translations...\n');

  // Get all phrases with Russian translations but no English translations
  const { data: phrases } = await supabase
    .from('phrases')
    .select('id, portuguese_text');

  if (!phrases || phrases.length === 0) {
    console.log('⚠️  No phrases found');
    return;
  }

  console.log(`Found ${phrases.length} phrases\n`);

  // Get existing translations
  const { data: existingTranslations } = await supabase
    .from('translations')
    .select('phrase_id, language_code');

  const enTranslations = new Set(
    existingTranslations
      ?.filter(t => t.language_code === 'en')
      .map(t => t.phrase_id) || []
  );

  const phrasesNeedingTranslation = phrases.filter(p => !enTranslations.has(p.id));

  console.log(`Phrases needing English translation: ${phrasesNeedingTranslation.length}\n`);

  let successCount = 0;
  let errorCount = 0;

  // Translate and add translations
  for (let i = 0; i < phrasesNeedingTranslation.length; i++) {
    const phrase = phrasesNeedingTranslation[i];
    console.log(`[${i + 1}/${phrasesNeedingTranslation.length}] Translating: "${phrase.portuguese_text.substring(0, 50)}..."`);

    const englishTranslation = await translateText(phrase.portuguese_text, 'en');

    if (englishTranslation) {
      // Insert English translation
      const { error } = await supabase
        .from('translations')
        .insert({
          phrase_id: phrase.id,
          language_code: 'en',
          translation_text: englishTranslation,
        });

      if (error) {
        console.error(`   ❌ Error inserting translation: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Added: "${englishTranslation.substring(0, 50)}..."`);
        successCount++;
      }
    } else {
      errorCount++;
    }

    // Rate limiting: wait 200ms between requests
    if (i < phrasesNeedingTranslation.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Successfully added: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
}

if (require.main === module) {
  addEnglishTranslations().catch(console.error);
}

module.exports = { addEnglishTranslations };








