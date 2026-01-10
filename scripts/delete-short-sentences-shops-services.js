/**
 * Delete all short_sentence phrases for "Shops and Services" cluster
 * 
 * Usage:
 * node scripts/delete-short-sentences-shops-services.js
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

async function deleteShortSentences() {
  try {
    console.log('🔍 Finding "Shops and Services" cluster...');
    
    // Find cluster
    const { data: cluster, error: clusterError } = await supabase
      .from('clusters')
      .select('id, name')
      .eq('name', 'Shops and Services')
      .single();

    if (clusterError || !cluster) {
      console.error('❌ Cluster "Shops and Services" not found:', clusterError);
      process.exit(1);
    }

    console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})`);

    // Get all short_sentence phrases for this cluster
    const { data: phrases, error: phrasesError } = await supabase
      .from('phrases')
      .select('id, audio_url')
      .eq('cluster_id', cluster.id)
      .eq('phrase_type', 'short_sentence');

    if (phrasesError) {
      console.error('❌ Error fetching phrases:', phrasesError);
      process.exit(1);
    }

    console.log(`📋 Found ${phrases?.length || 0} short sentences to delete`);

    if (!phrases || phrases.length === 0) {
      console.log('✅ No short sentences to delete');
      return;
    }

    // Delete translations first (foreign key constraint)
    const phraseIds = phrases.map(p => p.id);
    console.log('🗑️  Deleting translations...');
    
    const { error: translationsError } = await supabase
      .from('translations')
      .delete()
      .in('phrase_id', phraseIds);

    if (translationsError) {
      console.error('❌ Error deleting translations:', translationsError);
      process.exit(1);
    }

    console.log(`✅ Deleted translations for ${phraseIds.length} phrases`);

    // Delete audio files from storage
    console.log('🗑️  Deleting audio files from storage...');
    const audioFiles = phrases
      .map(p => p.audio_url)
      .filter(url => url && url.includes('/storage/v1/object/public/'))
      .map(url => {
        // Extract file path from URL
        const match = url.match(/\/storage\/v1\/object\/public\/audio\/(.+)$/);
        return match ? match[1] : null;
      })
      .filter(Boolean);

    if (audioFiles.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('audio')
        .remove(audioFiles);

      if (storageError) {
        console.warn('⚠️  Error deleting audio files from storage:', storageError);
        console.log('   (This is okay if files are already deleted or don\'t exist)');
      } else {
        console.log(`✅ Deleted ${audioFiles.length} audio files from storage`);
      }
    } else {
      console.log('ℹ️  No audio files to delete from storage');
    }

    // Delete phrases
    console.log('🗑️  Deleting phrases...');
    const { error: deleteError } = await supabase
      .from('phrases')
      .delete()
      .eq('cluster_id', cluster.id)
      .eq('phrase_type', 'short_sentence');

    if (deleteError) {
      console.error('❌ Error deleting phrases:', deleteError);
      process.exit(1);
    }

    console.log(`✅ Successfully deleted ${phrases.length} short sentences and their translations`);
    console.log(`✅ Deleted ${audioFiles.length} audio files from storage`);
    console.log('✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Critical error:', error);
    process.exit(1);
  }
}

deleteShortSentences();







