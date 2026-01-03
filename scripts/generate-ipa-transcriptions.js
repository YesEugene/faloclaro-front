require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to convert Portuguese text to IPA using an online API
// For now, we'll use a placeholder that needs to be filled manually
// In production, you can use an IPA API service
async function textToIPA(text) {
  // TODO: Replace with actual IPA API call
  // For now, return a placeholder that indicates transcription is needed
  // You can use services like:
  // - https://api.ipa-reader.com (if available)
  // - Google Cloud Text-to-Speech with SSML
  // - Custom Portuguese IPA conversion library
  
  // Placeholder - this should be replaced with actual IPA generation
  return null; // Return null to skip phrases that need manual transcription
}

async function generateIPATranscriptions() {
  console.log('🎯 Starting IPA transcription generation...\n');

  try {
    // Fetch all phrases without IPA transcription
    const { data: phrases, error: fetchError } = await supabase
      .from('phrases')
      .select('id, portuguese_text, ipa_transcription')
      .is('ipa_transcription', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!phrases || phrases.length === 0) {
      console.log('✅ All phrases already have IPA transcriptions!');
      return;
    }

    console.log(`📝 Found ${phrases.length} phrases without IPA transcription\n`);

    // Process in batches to avoid overwhelming the API
    const batchSize = 10;
    let processed = 0;

    for (let i = 0; i < phrases.length; i += batchSize) {
      const batch = phrases.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}...`);

      for (const phrase of batch) {
        try {
          // Generate IPA transcription
          const ipa = await textToIPA(phrase.portuguese_text);
          
          // Skip if IPA is null (needs manual transcription)
          if (!ipa) {
            console.log(`⏭️  [${i + batch.indexOf(phrase) + 1}/${phrases.length}] Skipping ${phrase.portuguese_text} - needs manual transcription`);
            continue;
          }
          
          // Update phrase with IPA transcription
          const { error: updateError } = await supabase
            .from('phrases')
            .update({ ipa_transcription: ipa })
            .eq('id', phrase.id);

          if (updateError) {
            console.error(`❌ Error updating phrase ${phrase.id}:`, updateError.message);
          } else {
            processed++;
            console.log(`✅ [${processed}/${phrases.length}] ${phrase.portuguese_text} → ${ipa}`);
          }
        } catch (error) {
          console.error(`❌ Error processing phrase ${phrase.id}:`, error.message);
        }
      }

      // Small delay between batches
      if (i + batchSize < phrases.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n✅ Successfully processed ${processed} phrases!`);
  } catch (error) {
    console.error('❌ Error generating IPA transcriptions:', error);
    process.exit(1);
  }
}

// Run the script
generateIPATranscriptions();

