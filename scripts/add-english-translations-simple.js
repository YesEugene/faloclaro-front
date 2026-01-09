/**
 * Add English translations to phrases (simple version)
 * 
 * This script will add English translations based on Portuguese text
 * For now, it will use Portuguese text as English translation (temporary)
 * You can later update these translations manually or via Google Translate API
 * 
 * Usage:
 * node scripts/add-english-translations-simple.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addEnglishTranslations() {
  console.log('🌐 Adding English translations (simple version)...\n');
  console.log('⚠️  This will use Portuguese text as English translation (temporary)\n');
  console.log('   You can update these translations later manually or via Google Translate API\n');

  // Get all phrases
  const { data: phrases } = await supabase
    .from('phrases')
    .select('id, portuguese_text');

  if (!phrases || phrases.length === 0) {
    console.log('⚠️  No phrases found');
    return;
  }

  console.log(`Found ${phrases.length} phrases\n`);

  // Get existing English translations
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

  if (phrasesNeedingTranslation.length === 0) {
    console.log('✅ All phrases already have English translations!');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  // Add English translations (using Portuguese text as temporary translation)
  for (let i = 0; i < phrasesNeedingTranslation.length; i++) {
    const phrase = phrasesNeedingTranslation[i];
    
    if (i < 5 || i % 50 === 0) {
      console.log(`[${i + 1}/${phrasesNeedingTranslation.length}] Adding translation for: "${phrase.portuguese_text.substring(0, 50)}..."`);
    }

    // For now, use Portuguese text as English translation
    // This is temporary - you should replace with proper English translations
    const englishTranslation = phrase.portuguese_text;

    // Insert English translation
    const { error } = await supabase
      .from('translations')
      .insert({
        phrase_id: phrase.id,
        language_code: 'en',
        translation_text: englishTranslation,
      });

    if (error) {
      if (i < 5) {
        console.error(`   ❌ Error: ${error.message}`);
      }
      errorCount++;
    } else {
      if (i < 5) {
        console.log(`   ✅ Added`);
      }
      successCount++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Successfully added: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log(`\n⚠️  Note: These are temporary translations (Portuguese text).`);
  console.log(`   Please update them with proper English translations.`);
  console.log(`   You can use Google Translate API or add them manually.`);
}

if (require.main === module) {
  addEnglishTranslations().catch(console.error);
}

module.exports = { addEnglishTranslations };







