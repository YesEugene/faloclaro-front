/**
 * Clean database and re-import all phrases from Clasters folder
 * 
 * Usage:
 * node scripts/clean-and-import.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanDatabase() {
  console.log('🧹 Cleaning database...\n');

  // Delete all translations
  const { error: transError } = await supabase
    .from('translations')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (transError) {
    console.error('❌ Error deleting translations:', transError);
    return false;
  }

  // Delete all phrases
  const { error: phrasesError } = await supabase
    .from('phrases')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (phrasesError) {
    console.error('❌ Error deleting phrases:', phrasesError);
    return false;
  }

  console.log('✅ Database cleaned\n');
  return true;
}

async function main() {
  const cleaned = await cleanDatabase();
  
  if (!cleaned) {
    console.error('❌ Failed to clean database');
    process.exit(1);
  }

  console.log('📥 Now run the import script:');
  console.log('   node scripts/import-clusters.js\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { cleanDatabase };










