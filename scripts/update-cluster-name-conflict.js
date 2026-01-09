/**
 * Update cluster name: "Conflict and Discontent" → "Conflict and Stress"
 * 
 * Usage:
 * node scripts/update-cluster-name-conflict.js
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

async function updateClusterName() {
  console.log('🔄 Updating cluster: "Conflict and Discontent" → "Conflict and Stress"\n');
  
  // First, check if cluster exists
  const { data: existingCluster, error: checkError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Conflict and Discontent')
    .single();

  if (checkError || !existingCluster) {
    console.error('❌ Cluster "Conflict and Discontent" not found:', checkError);
    return false;
  }

  console.log(`   Found cluster ID: ${existingCluster.id}`);

  // Check if new name already exists
  const { data: duplicateCluster, error: dupError } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Conflict and Stress')
    .single();

  if (duplicateCluster && duplicateCluster.id !== existingCluster.id) {
    console.error('❌ Cluster with name "Conflict and Stress" already exists (ID: ${duplicateCluster.id})');
    return false;
  }

  // Update cluster name
  const { data: updatedCluster, error: updateError } = await supabase
    .from('clusters')
    .update({ name: 'Conflict and Stress' })
    .eq('id', existingCluster.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating cluster:', updateError);
    return false;
  }

  console.log(`   ✅ Successfully updated to: "${updatedCluster.name}"`);
  return true;
}

async function main() {
  console.log('🚀 Starting cluster name update...\n');

  const success = await updateClusterName();

  if (success) {
    console.log('\n✅ Update complete!');
  } else {
    console.log('\n❌ Update failed!');
    process.exit(1);
  }
}

main().catch(console.error);


