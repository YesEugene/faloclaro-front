/**
 * Add a single movie quote to "Cult Phrases" cluster
 * 
 * Usage:
 * node scripts/add-single-movie-quote.js
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

// Extract year from movie title
function extractYear(movieTitle) {
  if (!movieTitle) return null;
  const yearMatch = movieTitle.match(/\((\d{4})\)/);
  return yearMatch ? parseInt(yearMatch[1], 10) : null;
}

// Clean movie title (remove year in parentheses)
function cleanMovieTitle(movieTitle) {
  if (!movieTitle) return null;
  return movieTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

async function getCluster() {
  const { data: cluster, error } = await supabase
    .from('clusters')
    .select('id, name')
    .eq('name', 'Cult Phrases')
    .single();

  if (error || !cluster) {
    console.error('❌ Cluster "Cult Phrases" not found:', error);
    process.exit(1);
  }

  return cluster;
}

async function getMaxOrderIndex(clusterId) {
  const { data, error } = await supabase
    .from('phrases')
    .select('order_index')
    .eq('cluster_id', clusterId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Error getting max order_index:', error);
    return 0;
  }

  return data?.order_index || 0;
}

async function addMovieQuote() {
  console.log('🚀 Adding new movie quote to "Cult Phrases" cluster...\n');

  // Get cluster
  const cluster = await getCluster();
  console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Get max order_index
  const maxOrderIndex = await getMaxOrderIndex(cluster.id);
  const newOrderIndex = maxOrderIndex + 1;
  console.log(`📊 Current max order_index: ${maxOrderIndex}, new phrase will have: ${newOrderIndex}\n`);

  // New quote data
  const quoteData = {
    portuguese: 'Ou estás comigo, ou contra mim.',
    ipa: 'oˈu ʃˈtaʃ kɔˈmiɡu | oˈu ˈkõtɾɐ ˈmĩ',
    ru: 'Ты либо со мной, либо против меня.',
    en: 'You\'re either with me or against me.',
    movie: 'Scarface (A Força do Poder)',
    character: 'Tony Montana',
  };

  const movieTitle = cleanMovieTitle(quoteData.movie);
  const movieYear = extractYear(quoteData.movie);

  console.log('📝 Quote data:');
  console.log(`   PT: ${quoteData.portuguese}`);
  console.log(`   IPA: ${quoteData.ipa}`);
  console.log(`   RU: ${quoteData.ru}`);
  console.log(`   EN: ${quoteData.en}`);
  console.log(`   Movie: ${movieTitle}${movieYear ? ` (${movieYear})` : ''}`);
  console.log(`   Character: ${quoteData.character}\n`);

  try {
    // Insert phrase
    const { data: phrase, error: phraseError } = await supabase
      .from('phrases')
      .insert({
        cluster_id: cluster.id,
        portuguese_text: quoteData.portuguese,
        ipa_transcription: quoteData.ipa || null,
        phrase_type: 'long_sentence',
        order_index: newOrderIndex,
        movie_title: movieTitle || null,
        movie_character: quoteData.character || null,
        movie_year: movieYear,
      })
      .select()
      .single();

    if (phraseError) {
      console.error('❌ Error inserting phrase:', phraseError);
      process.exit(1);
    }

    console.log(`✅ Phrase inserted with ID: ${phrase.id}\n`);

    // Insert translations
    const translations = [];
    
    if (quoteData.ru) {
      translations.push({
        phrase_id: phrase.id,
        language_code: 'ru',
        translation_text: quoteData.ru,
      });
    }
    
    if (quoteData.en) {
      translations.push({
        phrase_id: phrase.id,
        language_code: 'en',
        translation_text: quoteData.en,
      });
    }

    if (translations.length > 0) {
      const { error: transError } = await supabase
        .from('translations')
        .insert(translations);

      if (transError) {
        console.error('❌ Error inserting translations:', transError);
        process.exit(1);
      }

      console.log(`✅ Translations inserted: ${translations.length}\n`);
    }

    console.log('✅ Quote successfully added!');
    console.log(`\n📋 Next step: Generate audio for this phrase:`);
    console.log(`   node scripts/generate-audio-movie-quotes.js`);
    console.log(`   (or use the phrase ID: ${phrase.id})`);
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

addMovieQuote().catch(console.error);

