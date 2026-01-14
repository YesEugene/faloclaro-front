/**
 * Check phrase counts for "Shops and Services" cluster
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

async function checkCounts() {
  try {
    const { data: cluster, error: clusterError } = await supabase
      .from('clusters')
      .select('id, name')
      .eq('name', 'Shops and Services')
      .single();

    if (clusterError || !cluster) {
      console.error('❌ Cluster not found:', clusterError);
      process.exit(1);
    }

    // Count by phrase type
    const { data: words, error: wordsError } = await supabase
      .from('phrases')
      .select('id', { count: 'exact' })
      .eq('cluster_id', cluster.id)
      .eq('phrase_type', 'word');

    const { data: shortSentences, error: shortError } = await supabase
      .from('phrases')
      .select('id', { count: 'exact' })
      .eq('cluster_id', cluster.id)
      .eq('phrase_type', 'short_sentence');

    const { data: longSentences, error: longError } = await supabase
      .from('phrases')
      .select('id', { count: 'exact' })
      .eq('cluster_id', cluster.id)
      .eq('phrase_type', 'long_sentence');

    console.log('\n📊 Phrase counts for "Shops and Services":');
    console.log(`   Words: ${words?.length || 0}`);
    console.log(`   Short sentences: ${shortSentences?.length || 0}`);
    console.log(`   Long sentences: ${longSentences?.length || 0}`);
    console.log(`   Total: ${(words?.length || 0) + (shortSentences?.length || 0) + (longSentences?.length || 0)}\n`);

    // Check for duplicates in short sentences
    const { data: allShort, error: allShortError } = await supabase
      .from('phrases')
      .select('portuguese_text')
      .eq('cluster_id', cluster.id)
      .eq('phrase_type', 'short_sentence');

    if (allShort) {
      const texts = allShort.map(p => p.portuguese_text);
      const unique = new Set(texts);
      if (texts.length !== unique.size) {
        console.log('⚠️  Found duplicates in short sentences:');
        const duplicates = texts.filter((text, index) => texts.indexOf(text) !== index);
        console.log('   Duplicates:', [...new Set(duplicates)]);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCounts();









