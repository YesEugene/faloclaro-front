/**
 * Update lesson yaml_content in database for Day 1
 * Reads from day_01.yaml and updates the lessons table
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

async function main() {
  console.log('🚀 Updating Day 1 lesson yaml_content in database...\n');

  // Read YAML file
  const yamlPath = path.join(__dirname, '../Subsription/1 Day/day_01.yaml');
  if (!fs.existsSync(yamlPath)) {
    console.error(`❌ YAML file not found: ${yamlPath}`);
    process.exit(1);
  }

  const yamlContent = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
  
  // Convert to JSON string for database storage
  const yamlContentJson = JSON.stringify(yamlContent);

  console.log('📋 YAML content loaded:');
  console.log(`   Tasks count: ${yamlContent.tasks?.length || 0}`);
  console.log(`   Task 2 type: ${yamlContent.tasks?.[1]?.type || 'not found'}`);
  console.log(`   Task 2 has structure: ${!!yamlContent.tasks?.[1]?.structure}`);
  console.log(`   Task 2 has blocks: ${!!yamlContent.tasks?.[1]?.blocks}`);
  console.log(`   Task 2 blocks count: ${yamlContent.tasks?.[1]?.blocks ? Object.keys(yamlContent.tasks[1].blocks).length : 0}\n`);

  // Find lesson for day 1
  const { data: lesson, error: findError } = await supabase
    .from('lessons')
    .select('id, day_number')
    .eq('day_number', 1)
    .single();

  if (findError || !lesson) {
    console.error('❌ Lesson not found for day 1:', findError?.message);
    process.exit(1);
  }

  console.log(`📝 Found lesson: Day ${lesson.day_number}, ID: ${lesson.id}\n`);

  // Update yaml_content
  console.log('📤 Updating yaml_content in database...');
  const { data: updatedLesson, error: updateError } = await supabase
    .from('lessons')
    .update({ 
      yaml_content: yamlContentJson 
    })
    .eq('id', lesson.id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating lesson:', updateError.message);
    process.exit(1);
  }

  console.log('✅ Lesson updated successfully!');
  console.log(`   Lesson ID: ${updatedLesson.id}`);
  console.log(`   Day: ${updatedLesson.day_number}`);
  console.log(`   yaml_content type: ${typeof updatedLesson.yaml_content}`);
  
  // Verify the update
  if (typeof updatedLesson.yaml_content === 'string') {
    try {
      const parsed = JSON.parse(updatedLesson.yaml_content);
      console.log(`   Parsed tasks count: ${parsed.tasks?.length || 0}`);
      console.log(`   Task 2 type: ${parsed.tasks?.[1]?.type || 'not found'}`);
      console.log(`   Task 2 has structure: ${!!parsed.tasks?.[1]?.structure}`);
      console.log(`   Task 2 has blocks: ${!!parsed.tasks?.[1]?.blocks}`);
    } catch (e) {
      console.warn('⚠️  Could not parse updated yaml_content:', e.message);
    }
  }

  console.log('\n✅ Update complete! The lesson should now display task 2 correctly.');
}

main().catch(console.error);

