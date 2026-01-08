/**
 * Import lessons from YAML files
 * 
 * Usage:
 * node scripts/import-lessons.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const LESSONS_DIR = path.join(__dirname, '../Subsription/1 Day');

// Parse YAML file
function parseYAMLFile(filePath) {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const data = yaml.load(fileContents);
    return data;
  } catch (error) {
    console.error(`Error parsing YAML file ${filePath}:`, error);
    return null;
  }
}

// Import single lesson
async function importLesson(dayNumber, yamlData) {
  try {
    const dayInfo = yamlData.day || {};
    
    // Check if lesson already exists
    const { data: existing, error: checkError } = await supabase
      .from('lessons')
      .select('id')
      .eq('day_number', dayNumber)
      .single();

    if (existing) {
      // Update existing lesson
      const { error: updateError } = await supabase
        .from('lessons')
        .update({
          title_ru: dayInfo.title || '',
          title_en: dayInfo.title_en || dayInfo.title || '',
          title_pt: dayInfo.title_pt || dayInfo.title || '',
          subtitle_ru: dayInfo.subtitle || null,
          subtitle_en: dayInfo.subtitle_en || dayInfo.subtitle || null,
          subtitle_pt: dayInfo.subtitle_pt || dayInfo.subtitle || null,
          estimated_time: dayInfo.estimated_time || null,
          yaml_content: yamlData,
        })
        .eq('day_number', dayNumber);

      if (updateError) {
        console.error(`Error updating lesson ${dayNumber}:`, updateError);
        return false;
      }

      console.log(`✅ Updated lesson ${dayNumber}`);
      return true;
    } else {
      // Create new lesson
      const { error: insertError } = await supabase
        .from('lessons')
        .insert({
          day_number: dayNumber,
          title_ru: dayInfo.title || '',
          title_en: dayInfo.title_en || dayInfo.title || '',
          title_pt: dayInfo.title_pt || dayInfo.title || '',
          subtitle_ru: dayInfo.subtitle || null,
          subtitle_en: dayInfo.subtitle_en || dayInfo.subtitle || null,
          subtitle_pt: dayInfo.subtitle_pt || dayInfo.subtitle || null,
          estimated_time: dayInfo.estimated_time || null,
          yaml_content: yamlData,
        });

      if (insertError) {
        console.error(`Error inserting lesson ${dayNumber}:`, insertError);
        return false;
      }

      console.log(`✅ Created lesson ${dayNumber}`);
      return true;
    }
  } catch (error) {
    console.error(`Error importing lesson ${dayNumber}:`, error);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting lesson import...\n');

  // Read all YAML files in lessons directory
  const files = fs.readdirSync(LESSONS_DIR).filter(file => file.endsWith('.yaml') || file.endsWith('.yml'));
  
  if (files.length === 0) {
    console.error(`❌ No YAML files found in ${LESSONS_DIR}`);
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} lesson file(s)\n`);

  let imported = 0;
  let errors = 0;

  for (const file of files) {
    const filePath = path.join(LESSONS_DIR, file);
    const yamlData = parseYAMLFile(filePath);

    if (!yamlData) {
      console.error(`❌ Failed to parse ${file}`);
      errors++;
      continue;
    }

    const dayNumber = yamlData.day?.number;
    if (!dayNumber) {
      console.error(`❌ No day number found in ${file}`);
      errors++;
      continue;
    }

    const success = await importLesson(dayNumber, yamlData);
    if (success) {
      imported++;
    } else {
      errors++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);

