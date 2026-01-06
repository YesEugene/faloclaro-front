/**
 * Update cluster names in the database
 * 
 * Changes:
 * 1. "Understanding / Not Understanding" → "Making sense"
 * 2. "Reactions and Responses" → "My take"
 * 3. "Movement, Time, Pauses" → "Time and Path"
 * 
 * Usage:
 * node scripts/update-cluster-names.js
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

async function updateClusterName(oldName, newName) {
  console.log(`\n🔄 Updating cluster: "${oldName}" → "${newName}"`);
  
  // First, check if cluster exists
  const { data: existingCluster, error: checkError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', oldName)
    .single();

  if (checkError || !existingCluster) {
    console.error(`❌ Cluster "${oldName}" not found:`, checkError);
    return false;
  }

  console.log(`   Found cluster ID: ${existingCluster.id}`);

  // Check if new name already exists
  const { data: duplicateCluster, error: dupError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', newName)
    .single();

  if (duplicateCluster && duplicateCluster.id !== existingCluster.id) {
    console.error(`❌ Cluster with name "${newName}" already exists (ID: ${duplicateCluster.id})`);
    return false;
  }

  // Update cluster name
  const { data: updatedCluster, error: updateError } = await supabase
    .from('clusters')
    .update({ name: newName })
    .eq('id', existingCluster.id)
    .select()
    .single();

  if (updateError) {
    console.error(`❌ Error updating cluster:`, updateError);
    return false;
  }

  console.log(`   ✅ Successfully updated to: "${updatedCluster.name}"`);
  return true;
}

async function main() {
  console.log('🚀 Starting cluster name updates...\n');

  const updates = [
    { old: 'Understanding / Not Understanding', new: 'Making sense' },
    { old: 'Reactions and Responses', new: 'My take' },
    { old: 'Movement, Time, Pauses', new: 'Time and Path' },
  ];

  let successCount = 0;
  let failCount = 0;

  for (const update of updates) {
    const success = await updateClusterName(update.old, update.new);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n✅ Update complete!`);
  console.log(`   Successfully updated: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

main().catch(console.error);

