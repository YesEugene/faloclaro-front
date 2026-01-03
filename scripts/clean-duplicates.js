/**
 * Clean duplicate clusters and old phrases
 * 
 * This script will:
 * 1. Find duplicate clusters (same name)
 * 2. Keep the one with more phrases, delete the other
 * 3. For first 4 clusters, identify and delete old phrases
 * 
 * Usage:
 * node scripts/clean-duplicates.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use Service Role Key for deletions (bypasses RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('   ⚠️  Using ANON_KEY - deletions may fail due to RLS');
    console.error('   💡 Add SUPABASE_SERVICE_ROLE_KEY to .env.local for full access');
  }
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Old phrases that should be deleted from first 4 clusters
// These are the short phrases from the original 100 phrases
const oldPhrases = [
  'Sim.', 'Não.', 'Talvez.', 'Claro.', 'Está bem.', 'Tudo bem.', 'Perfeito.', 'Exacto.', 'Pois.', 'Depende.',
  'Não sei.', 'Acho que sim.', 'Acho que não.', 'Pode ser.', 'Já vejo.', 'Vamos ver.', 'Com certeza.', 'Nem por isso.', 'É verdade.', 'Tens razão.',
  'Não acredito.', 'A sério?', 'Que pena.', 'Que bom.', 'Que estranho.', 'Faz sentido.', 'Não importa.', 'Não faz mal.', 'Tudo certo.', 'Está feito.',
  'Por favor.', 'Obrigada.', 'Muito obrigada.', 'De nada.', 'Com licença.', 'Desculpa.', 'Peço desculpa.', 'Pode ajudar-me?', 'Pode repetir?', 'Mais devagar, por favor.',
  'Pode esperar?', 'Um momento.', 'Já vou.', 'Já volto.', 'Não é preciso.', 'Está tudo bem.', 'Sem problema.', 'Se faz favor.', 'Pode ser agora?', 'Quando puder.',
  'Obrigada pela ajuda.', 'Lamento.', 'Desculpe o atraso.', 'Foi sem querer.', 'Não foi nada.',
  'Não percebi.', 'Percebo.', 'Não entendo.', 'Agora percebo.', 'Mais ou menos.', 'Um pouco.', 'Não muito.', 'Tudo claro.', 'Não está claro.', 'Pode explicar?',
  'O que quer dizer?', 'Como assim?', 'Já entendi.', 'Não tenho a certeza.', 'Parece-me bem.', 'Não parece.', 'É diferente.', 'Faz diferença.', 'É igual.', 'É parecido.',
  'Agora não.', 'Agora sim.', 'Mais tarde.', 'Hoje não.', 'Amanhã.', 'Depois.', 'Antes.', 'Já passou.', 'Ainda não.', 'Já está.',
  'Ainda há tempo.', 'Estou a chegar.', 'Estou a ir.', 'Estou aqui.', 'Já cheguei.', 'Fico aqui.', 'Vamos embora.', 'Volto já.', 'Sem pressa.', 'Com calma.',
  'Muito cedo.', 'Muito tarde.', 'A tempo.', 'Fora de horas.', 'Está perto.',
];

async function findDuplicateClusters() {
  console.log('🔍 Finding duplicate clusters...\n');

  const { data: clusters, error } = await supabase
    .from('clusters')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('❌ Error loading clusters:', error);
    return;
  }

  // Group clusters by name
  const clustersByName = {};
  clusters.forEach(cluster => {
    if (!clustersByName[cluster.name]) {
      clustersByName[cluster.name] = [];
    }
    clustersByName[cluster.name].push(cluster);
  });

  // Find duplicates
  const duplicates = [];
  for (const [name, clusterList] of Object.entries(clustersByName)) {
    if (clusterList.length > 1) {
      duplicates.push({ name, clusters: clusterList });
    }
  }

  return { clusters, duplicates };
}

async function getPhraseCount(clusterId) {
  const { count, error } = await supabase
    .from('phrases')
    .select('*', { count: 'exact', head: true })
    .eq('cluster_id', clusterId);

  if (error) {
    console.error(`   ⚠ Error counting phrases for cluster ${clusterId}:`, error);
    return 0;
  }

  return count || 0;
}

async function deleteOldPhrasesFromCluster(clusterId, clusterName) {
  console.log(`\n🧹 Cleaning old phrases from "${clusterName}"...`);

  const { data: phrases, error } = await supabase
    .from('phrases')
    .select('id, portuguese_text')
    .eq('cluster_id', clusterId);

  if (error) {
    console.error(`   ❌ Error loading phrases:`, error);
    return 0;
  }

  const oldPhraseIds = phrases
    .filter(p => oldPhrases.includes(p.portuguese_text))
    .map(p => p.id);

  if (oldPhraseIds.length === 0) {
    console.log(`   ✓ No old phrases found`);
    return 0;
  }

  console.log(`   📝 Found ${oldPhraseIds.length} old phrases to delete`);

  // Delete translations first (CASCADE will handle it, but being explicit)
  const { error: transError } = await supabase
    .from('translations')
    .delete()
    .in('phrase_id', oldPhraseIds);

  if (transError) {
    console.error(`   ⚠ Error deleting translations:`, transError);
  }

  // Delete phrases
  const { error: phrasesError } = await supabase
    .from('phrases')
    .delete()
    .in('id', oldPhraseIds);

  if (phrasesError) {
    console.error(`   ❌ Error deleting phrases:`, phrasesError);
    return 0;
  }

  console.log(`   ✅ Deleted ${oldPhraseIds.length} old phrases`);
  return oldPhraseIds.length;
}

async function deleteDuplicateCluster(clusterId, clusterName) {
  console.log(`   🗑️  Deleting duplicate cluster "${clusterName}" (ID: ${clusterId})...`);

  // Delete cluster (CASCADE will delete all phrases and translations)
  const { error } = await supabase
    .from('clusters')
    .delete()
    .eq('id', clusterId);

  if (error) {
    console.error(`   ❌ Error deleting cluster:`, error);
    return false;
  }

  console.log(`   ✅ Deleted duplicate cluster`);
  return true;
}

async function main() {
  console.log('🚀 Starting cleanup of duplicates and old phrases...\n');

  // Step 1: Find duplicates
  const { clusters, duplicates } = await findDuplicateClusters();

  if (!clusters) {
    console.error('❌ Failed to load clusters');
    process.exit(1);
  }

  console.log(`Found ${clusters.length} total clusters`);
  console.log(`Found ${duplicates.length} duplicate cluster names\n`);

  // Step 2: Handle duplicates
  if (duplicates.length > 0) {
    console.log('📋 Processing duplicates:\n');

    for (const { name, clusters: clusterList } of duplicates) {
      console.log(`\n🔍 Duplicate: "${name}" (${clusterList.length} instances)`);

      // Get phrase count for each cluster
      const clustersWithCounts = await Promise.all(
        clusterList.map(async (cluster) => ({
          ...cluster,
          phraseCount: await getPhraseCount(cluster.id),
        }))
      );

      // Sort by phrase count (descending)
      clustersWithCounts.sort((a, b) => b.phraseCount - a.phraseCount);

      // Keep the one with most phrases, delete others
      const toKeep = clustersWithCounts[0];
      const toDelete = clustersWithCounts.slice(1);

      console.log(`   ✓ Keeping cluster with ${toKeep.phraseCount} phrases (ID: ${toKeep.id})`);

      for (const clusterToDelete of toDelete) {
        console.log(`   🗑️  Deleting cluster with ${clusterToDelete.phraseCount} phrases (ID: ${clusterToDelete.id})`);
        await deleteDuplicateCluster(clusterToDelete.id, name);
      }
    }
  }

  // Step 3: Clean old phrases from first 4 clusters
  console.log('\n\n🧹 Cleaning old phrases from first 4 clusters...\n');

  const first4Clusters = [
    'Reactions and Responses',
    'Politeness and Requests',
    'Understanding / Not Understanding',
    'Movement, Time, Pauses',
  ];

  let totalDeleted = 0;

  for (const clusterName of first4Clusters) {
    const { data: clusterData } = await supabase
      .from('clusters')
      .select('id, name')
      .eq('name', clusterName)
      .limit(1)
      .single();

    if (clusterData) {
      const deleted = await deleteOldPhrasesFromCluster(clusterData.id, clusterName);
      totalDeleted += deleted;
    } else {
      console.log(`   ⚠ Cluster "${clusterName}" not found`);
    }
  }

  console.log(`\n✅ Cleanup complete!`);
  console.log(`   Deleted ${totalDeleted} old phrases from first 4 clusters`);
  console.log(`   Deleted ${duplicates.length > 0 ? duplicates.reduce((sum, d) => sum + (d.clusters.length - 1), 0) : 0} duplicate clusters`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { findDuplicateClusters, deleteOldPhrasesFromCluster };

