/**
 * Generate audio for Day 2 lesson vocabulary cards and phrases
 */

const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Google Cloud TTS client with credentials file
const credentialsPath = path.join(__dirname, '../google-credentials.json');
if (!fs.existsSync(credentialsPath)) {
  console.error('❌ google-credentials.json not found at:', credentialsPath);
  process.exit(1);
}

const client = new textToSpeech.TextToSpeechClient({
  keyFilename: credentialsPath,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// European Portuguese voice (Female)
const VOICE_CONFIG = {
  languageCode: 'pt-PT',
  name: 'pt-PT-Wavenet-B',
  ssmlGender: 'FEMALE',
};

const OUTPUT_DIR = path.join(__dirname, '../audio-output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function sanitizeFilename(text) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function generateAudio(text, outputFilename) {
  const outputPath = path.join(OUTPUT_DIR, outputFilename);

  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipped (exists): ${outputFilename}`);
    return { filename: outputFilename, path: outputPath, skipped: true };
  }

  const request = {
    input: { text },
    voice: VOICE_CONFIG,
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: 1.0,
    },
  };

  try {
    const [response] = await client.synthesizeSpeech(request);
    fs.writeFileSync(outputPath, response.audioContent, 'binary');
    console.log(`✅ Generated: ${outputFilename}`);
    return { filename: outputFilename, path: outputPath, skipped: false };
  } catch (error) {
    console.error(`❌ Error generating audio for "${text}":`, error.message);
    return null;
  }
}

async function checkAudioInPhrases(text) {
  // Check if audio already exists in phrases table
  const { data: phrase } = await supabase
    .from('phrases')
    .select('id, audio_url')
    .eq('portuguese_text', text)
    .single();

  if (phrase?.audio_url) {
    console.log(`ℹ️  Audio exists in phrases table for: "${text}"`);
    return phrase.audio_url;
  }

  return null;
}

async function main() {
  console.log('🚀 Generating audio for Day 2 lesson...\n');

  // Read main YAML file
  const yamlPath = path.join(__dirname, '../Subsription/2 Day/day_02.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.error(`❌ YAML file not found: ${yamlPath}`);
    process.exit(1);
  }

  const yamlData = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  
  // Read task YAML files
  const task2Path = path.join(__dirname, '../Subsription/2 Day/day02_task02_rules.yaml');
  const task3Path = path.join(__dirname, '../Subsription/2 Day/day02_task03_listening.yaml');
  const task4Path = path.join(__dirname, '../Subsription/2 Day/day02_task04_attention.yaml');
  const task5Path = path.join(__dirname, '../Subsription/2 Day/day02_task05_writing.yaml');

  const task2Data = fs.existsSync(task2Path) ? yaml.load(fs.readFileSync(task2Path, 'utf8')) : null;
  const task3Data = fs.existsSync(task3Path) ? yaml.load(fs.readFileSync(task3Path, 'utf8')) : null;
  const task4Data = fs.existsSync(task4Path) ? yaml.load(fs.readFileSync(task4Path, 'utf8')) : null;
  const task5Data = fs.existsSync(task5Path) ? yaml.load(fs.readFileSync(task5Path, 'utf8')) : null;

  // Collect all texts to generate
  const textsToGenerate = new Set(); // Use Set to avoid duplicates

  // 1. Vocabulary words from task 1
  const vocabularyTask = yamlData.tasks?.find(t => t.type === 'vocabulary');
  if (vocabularyTask && vocabularyTask.content?.cards) {
    console.log(`📝 Found ${vocabularyTask.content.cards.length} vocabulary cards\n`);
    for (const card of vocabularyTask.content.cards) {
      if (card.word) {
        textsToGenerate.add(card.word);
      }
    }
  }

  // 2. Phrases from task 2 (rules)
  if (task2Data) {
    console.log(`📝 Processing task 2 (rules) phrases...\n`);
    // Check both task.blocks and blocks structure
    const blocks = task2Data.task?.blocks || task2Data.blocks || {};
    for (const blockKey in blocks) {
      const block = blocks[blockKey];
      // Examples in explanation blocks
      if (block.examples && Array.isArray(block.examples)) {
        for (const example of block.examples) {
          if (example.text && example.audio) {
            textsToGenerate.add(example.text);
          }
        }
      }
      // Comparison cards
      if (block.comparison_card && Array.isArray(block.comparison_card)) {
        for (const card of block.comparison_card) {
          if (card.text && card.audio) {
            textsToGenerate.add(card.text);
          }
        }
      }
      // Task audio
      if (block.task_1?.audio) {
        textsToGenerate.add(block.task_1.audio);
      }
      if (block.task_2?.options && Array.isArray(block.task_2.options)) {
        for (const option of block.task_2.options) {
          if (option.text && option.correct) {
            textsToGenerate.add(option.text);
          }
        }
      }
    }
  }

  // 3. Phrases from task 3 (listening)
  if (task3Data) {
    console.log(`📝 Processing task 3 (listening) phrases...\n`);
    const items = task3Data.task?.items || task3Data.items || [];
    for (const item of items) {
      if (item.audio) {
        textsToGenerate.add(item.audio);
      }
    }
  }

  // 4. Phrases from task 4 (attention)
  if (task4Data) {
    console.log(`📝 Processing task 4 (attention) phrases...\n`);
    const items = task4Data.task?.items || task4Data.items || [];
    for (const item of items) {
      if (item.audio) {
        textsToGenerate.add(item.audio);
      }
    }
  }

  // 5. Phrases from task 5 (writing)
  if (task5Data) {
    console.log(`📝 Processing task 5 (writing) phrases...\n`);
    const task = task5Data.task || task5Data;
    if (task.main_task?.template && Array.isArray(task.main_task.template)) {
      for (const template of task.main_task.template) {
        // Extract text from template (remove ___)
        const text = template.replace(/___/g, '').trim();
        if (text) {
          textsToGenerate.add(text);
        }
      }
    }
    if (task.example?.content && Array.isArray(task.example.content)) {
      for (const example of task.example.content) {
        if (example) {
          textsToGenerate.add(example);
        }
      }
    }
  }

  console.log(`📋 Total unique texts to generate: ${textsToGenerate.size}\n`);

  let generated = 0;
  let skipped = 0;
  let errors = 0;
  const audioFiles = [];

  for (const text of textsToGenerate) {
    // Check if audio exists in phrases table
    const existingAudioUrl = await checkAudioInPhrases(text);
    if (existingAudioUrl) {
      console.log(`⏭️  Skipped (exists in DB): ${text}`);
      skipped++;
      continue;
    }

    // Generate audio
    const filename = `lesson-2-${sanitizeFilename(text)}.mp3`;
    const result = await generateAudio(text, filename);

    if (result) {
      if (result.skipped) {
        skipped++;
      } else {
        generated++;
        audioFiles.push({
          filename: result.filename,
          path: result.path,
          text: text,
        });
      }
    } else {
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log(`\n✅ Audio generation complete!`);
  console.log(`   Generated: ${generated}`);
  console.log(`   Skipped (exists): ${skipped}`);
  console.log(`   Errors: ${errors}`);
  console.log(`\n📋 Generated files:`);
  audioFiles.forEach(file => {
    console.log(`   - ${file.filename} (${file.text})`);
  });
  console.log(`\n📋 Next step: Upload audio files to Supabase Storage`);
  console.log(`   Run: node scripts/upload-audio-to-storage-service-key.js`);
}

main().catch(console.error);

