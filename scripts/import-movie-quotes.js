/**
 * Import cult phrases from CSV file for "Cult Phrases" cluster
 * File: Фразы из фильмов.csv
 * 
 * Usage:
 * node scripts/import-movie-quotes.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CATEGORIES_DIR = path.join(__dirname, '../Categories/Movie Quotes');

// Extract value from line (e.g., "PT: text" -> "text")
function extractValue(line, prefix) {
  if (!line || !line.trim()) return null;
  const trimmed = line.trim();
  if (trimmed.startsWith(prefix + ':')) {
    return trimmed.replace(new RegExp('^' + prefix + ':\\s*'), '').trim().replace(/^"|"$/g, '');
  }
  return null;
}

// Extract year from movie title (e.g., "Terminator 2: Judgment Day" -> null, "The Godfather (1972)" -> 1972)
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

// Parse movie quotes CSV file
function parseMovieQuotesCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const quotes = [];
  let currentQuote = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      // Empty line - save current quote if exists
      if (currentQuote && currentQuote.portuguese) {
        quotes.push(currentQuote);
        currentQuote = null;
      }
      continue;
    }
    
    if (!currentQuote) {
      currentQuote = {
        portuguese: '',
        ipa: '',
        ru: '',
        en: '',
        movie: '',
        character: '',
      };
    }
    
    const pt = extractValue(line, 'PT');
    if (pt) {
      currentQuote.portuguese = pt;
    }
    
    const ipa = extractValue(line, 'IPA');
    if (ipa) {
      currentQuote.ipa = ipa;
    }
    
    const ru = extractValue(line, 'RU');
    if (ru) {
      currentQuote.ru = ru;
    }
    
    const en = extractValue(line, 'EN');
    if (en) {
      currentQuote.en = en;
    }
    
    const movie = extractValue(line, 'Фильм');
    if (movie) {
      currentQuote.movie = movie;
    }
    
    const character = extractValue(line, 'Герой');
    if (character) {
      currentQuote.character = character;
    }
  }
  
  // Don't forget the last quote
  if (currentQuote && currentQuote.portuguese) {
    quotes.push(currentQuote);
  }
  
  return quotes;
}

// Get or find cluster
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

// Import phrases
async function importPhrases(clusterId, quotes) {
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < quotes.length; i++) {
    const quoteData = quotes[i];
    
    try {
      const movieTitle = cleanMovieTitle(quoteData.movie);
      const movieYear = extractYear(quoteData.movie);

      // Insert phrase
      const { data: phrase, error: phraseError } = await supabase
        .from('phrases')
        .insert({
          cluster_id: clusterId,
          portuguese_text: quoteData.portuguese,
          ipa_transcription: quoteData.ipa || null,
          phrase_type: 'long_sentence',
          order_index: i + 1,
          movie_title: movieTitle || null,
          movie_character: quoteData.character || null,
          movie_year: movieYear,
        })
        .select()
        .single();

      if (phraseError) {
        console.error(`❌ Error inserting phrase ${i + 1}:`, phraseError);
        errors++;
        continue;
      }

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
          console.error(`❌ Error inserting translations for phrase ${i + 1}:`, transError);
          errors++;
          continue;
        }
      }

      imported++;
      if ((i + 1) % 10 === 0) {
        console.log(`   Progress: ${i + 1}/${quotes.length} processed (${imported} imported, ${errors} errors)...`);
      }
    } catch (error) {
      console.error(`❌ Unexpected error processing quote ${i + 1}:`, error);
      errors++;
    }
  }

  return { imported, errors };
}

// Main function
async function main() {
  console.log('🚀 Starting import for "Cult Phrases" cluster...\n');

  // Get cluster
  console.log('🔍 Finding "Cult Phrases" cluster...');
  const cluster = await getCluster();
  console.log(`✅ Found cluster: ${cluster.name} (ID: ${cluster.id})\n`);

  // Parse quotes CSV
  const quotesFilePath = path.join(CATEGORIES_DIR, 'Фразы из фильмов.csv');
  if (!fs.existsSync(quotesFilePath)) {
    console.error(`❌ File not found: ${quotesFilePath}`);
    process.exit(1);
  }

  console.log('📖 Parsing CSV file...');
  const quotes = parseMovieQuotesCSV(quotesFilePath);
  console.log(`✅ Parsed Фразы из фильмов.csv: ${quotes.length} quotes\n`);

  // Import quotes
  console.log('📥 Importing phrases...');
  console.log(`📝 Importing ${quotes.length} movie quotes...`);
  const result = await importPhrases(cluster.id, quotes);
  console.log(`✅ Movie quotes: ${result.imported} imported, ${result.errors} errors\n`);

  console.log('✅ Import complete!');
}

main().catch(console.error);

