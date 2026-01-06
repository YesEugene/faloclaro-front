/**
 * Delete all phrases from "Cult Phrases" cluster
 * 
 * Usage:
 * node scripts/delete-movie-quotes.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('🚀 Starting deletion of Cult Phrases phrases...\n');

  // Find Cult Phrases cluster
  const { data: cluster, error: clusterError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Cult Phrases')
    .single();

  if (clusterError || !cluster) {
    console.error('❌ Cluster "Cult Phrases" not found:', clusterError);
    process.exit(1);
  }

  console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Get all phrases from this cluster
  const { data: phrases, error: phrasesError } = await supabase
    .from('phrases')
    .select('id, portuguese_text')
    .eq('cluster_id', cluster.id);

  if (phrasesError) {
    console.error('❌ Error fetching phrases:', phrasesError);
    process.exit(1);
  }

  if (!phrases || phrases.length === 0) {
    console.log('✅ No phrases found in Movie Quotes cluster');
    return;
  }

  console.log(`📋 Found ${phrases.length} phrases to delete\n`);

  // Delete translations first (foreign key constraint)
  const phraseIds = phrases.map(p => p.id);
  
  console.log('🗑️  Deleting translations...');
  const { error: transError } = await supabase
    .from('translations')
    .delete()
    .in('phrase_id', phraseIds);

  if (transError) {
    console.error('❌ Error deleting translations:', transError);
    process.exit(1);
  }
  console.log(`✅ Deleted translations for ${phraseIds.length} phrases\n`);

  // Delete phrases
  console.log('🗑️  Deleting phrases...');
  const { error: deleteError } = await supabase
    .from('phrases')
    .delete()
    .eq('cluster_id', cluster.id);

  if (deleteError) {
    console.error('❌ Error deleting phrases:', deleteError);
    process.exit(1);
  }

  console.log(`✅ Successfully deleted ${phrases.length} phrases from Cult Phrases cluster`);
}

main().catch(console.error);

