/**
 * Delete duplicate "Плохие слова / матерная речь" cluster
 * Keep only "Profanity" cluster
 * 
 * Usage:
 * node scripts/delete-duplicate-profanity-final.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔍 Searching for duplicate Profanity clusters...\n');

  // Find all clusters with names related to Profanity
  const { data: clusters, error: searchError } = await supabase
    .from('clusters')
    .select('id, name, description')
    .or('name.eq.Profanity,description.ilike.Плохие слова,description.ilike.матерная речь');

  if (searchError) {
    console.error('❌ Error searching clusters:', searchError.message);
    process.exit(1);
  }

  console.log('Found clusters:');
  clusters.forEach(c => {
    console.log(`  - "${c.name}" (ID: ${c.id}, description: "${c.description}")`);
  });

  // Find the duplicate cluster (not "Profanity")
  const duplicateCluster = clusters.find(c => c.name !== 'Profanity');
  const correctCluster = clusters.find(c => c.name === 'Profanity');

  if (!duplicateCluster) {
    console.log('\n✅ No duplicate cluster found. "Profanity" cluster is the only one.');
    return;
  }

  if (!correctCluster) {
    console.log('\n⚠️ Warning: "Profanity" cluster not found!');
    console.log('   Cannot delete duplicate safely.');
    return;
  }

  console.log(`\n🗑️  Deleting duplicate cluster: "${duplicateCluster.name}" (ID: ${duplicateCluster.id})`);
  console.log(`   Keeping: "Profanity" (ID: ${correctCluster.id})\n`);

  // Delete the duplicate cluster (CASCADE will delete all phrases and translations)
  const { error: deleteError } = await supabase
    .from('clusters')
    .delete()
    .eq('id', duplicateCluster.id);

  if (deleteError) {
    console.error('❌ Error deleting cluster:', deleteError.message);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted duplicate cluster: "${duplicateCluster.name}"`);
  console.log(`\n✅ Only "Profanity" cluster remains (ID: ${correctCluster.id})`);
}

main().catch(console.error);








