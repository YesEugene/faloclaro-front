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

const LESSONS_BASE_DIR = path.join(__dirname, '../Subsription');

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

// Load and merge lesson files
function loadLessonFiles(dayNumber) {
  const dayDir = path.join(LESSONS_BASE_DIR, `${dayNumber} Day`);
  
  if (!fs.existsSync(dayDir)) {
    console.error(`❌ Directory not found: ${dayDir}`);
    return null;
  }

  // Load main day file
  const dayFile = path.join(dayDir, `day_${String(dayNumber).padStart(2, '0')}.yaml`);
  if (!fs.existsSync(dayFile)) {
    console.error(`❌ Day file not found: ${dayFile}`);
    return null;
  }

  const dayData = parseYAMLFile(dayFile);
  if (!dayData) {
    return null;
  }

  // Ensure tasks array exists - tasks can be at top level (same level as day) or inside day
  // First, check if tasks are at top level
  if (!dayData.tasks) {
    dayData.tasks = [];
  }
  
  // If tasks are inside day object, move them to top level
  if (dayData.day && dayData.day.tasks && Array.isArray(dayData.day.tasks)) {
    console.log(`  📋 Found ${dayData.day.tasks.length} tasks inside day object, moving to top level`);
    dayData.tasks = [...dayData.day.tasks, ...dayData.tasks];
    // Remove tasks from day object to avoid duplication
    delete dayData.day.tasks;
  }
  
  // Log initial tasks count (task 1 should be here if it exists in day_XX.yaml)
  console.log(`  📋 Initial tasks count: ${dayData.tasks.length}`);
  if (dayData.tasks.length > 0) {
    dayData.tasks.forEach((t, i) => {
      console.log(`    Task ${i+1}: task_id=${t.task_id}, type=${t.type}`);
    });
  }

  // Load task files (tasks 1-5)
  // Task 1 vocabulary file is optional - if it exists, it will merge content with task 1 from day_XX.yaml
  const taskFiles = [
    `day${String(dayNumber).padStart(2, '0')}_task01_vocabulary.yaml`,
    `day${String(dayNumber).padStart(2, '0')}_task02_rules.yaml`,
    `day${String(dayNumber).padStart(2, '0')}_task03_listening.yaml`,
    `day${String(dayNumber).padStart(2, '0')}_task04_attention.yaml`,
    `day${String(dayNumber).padStart(2, '0')}_task05_writing.yaml`,
  ];

  // Merge task files into tasks array
  if (!dayData.tasks) {
    dayData.tasks = [];
  }

  // Task 1 is already in day_XX.yaml, so we start from task 2
  for (const taskFile of taskFiles) {
    const taskFilePath = path.join(dayDir, taskFile);
    if (fs.existsSync(taskFilePath)) {
      console.log(`  📄 Loading task file: ${taskFile}`);
      const taskData = parseYAMLFile(taskFilePath);
      if (taskData && taskData.task) {
        // Convert task object to array item format
        const taskItem = {
          task_id: taskData.task.task_id,
          type: taskData.task.type,
          title: taskData.task.title,
          subtitle: taskData.task.subtitle,
          estimated_time: taskData.task.estimated_time,
          show_timer: taskData.task.show_timer,
          show_settings: taskData.task.show_settings,
          completion_message: taskData.task.completion_message,
          optional: taskData.task.optional,
          ...taskData.task, // Include all other properties
        };
        
        // If task has structure and blocks, include them
        if (taskData.structure) {
          taskItem.structure = taskData.structure;
        }
        if (taskData.blocks) {
          taskItem.blocks = taskData.blocks;
        }
        if (taskData.ui_rules) {
          taskItem.ui_rules = taskData.ui_rules;
        }
        if (taskData.items) {
          taskItem.items = taskData.items;
        }
        if (taskData.instruction) {
          taskItem.instruction = taskData.instruction;
        }
        if (taskData.main_task) {
          taskItem.main_task = taskData.main_task;
        }
        if (taskData.example) {
          taskItem.example = taskData.example;
        }
        if (taskData.alternative) {
          taskItem.alternative = taskData.alternative;
        }
        if (taskData.reflection) {
          taskItem.reflection = taskData.reflection;
        }
        // Also include ui, card_format, content for vocabulary tasks
        if (taskData.ui) {
          taskItem.ui = taskData.ui;
        }
        if (taskData.card_format) {
          taskItem.card_format = taskData.card_format;
        }
        if (taskData.content) {
          taskItem.content = taskData.content;
        }

        // Find and replace existing task or add new one
        const existingIndex = dayData.tasks.findIndex(t => t.task_id === taskItem.task_id);
        if (existingIndex >= 0) {
          // For task 1 (vocabulary), merge content instead of replacing
          if (taskItem.task_id === 1 && taskItem.type === 'vocabulary') {
            const existingTask = dayData.tasks[existingIndex];
            // Merge vocabulary-specific content (ui, card_format, content)
            if (taskData.ui) {
              existingTask.ui = taskData.ui;
            }
            if (taskData.card_format) {
              existingTask.card_format = taskData.card_format;
            }
            if (taskData.content && taskData.content.cards) {
              existingTask.content = taskData.content;
            }
            // Merge other properties
            if (taskData.task.estimated_time) {
              existingTask.estimated_time = taskData.task.estimated_time;
            }
            if (taskData.task.show_timer !== undefined) {
              existingTask.show_timer = taskData.task.show_timer;
            }
            if (taskData.task.show_settings !== undefined) {
              existingTask.show_settings = taskData.task.show_settings;
            }
            console.log(`  ✅ Merged vocabulary content into task ${taskItem.task_id}`);
          } else {
            // For tasks 2-5, replace completely to ensure all data is included
            dayData.tasks[existingIndex] = taskItem;
            console.log(`  ✅ Updated task ${taskItem.task_id} (${taskItem.type})`);
          }
        } else {
          dayData.tasks.push(taskItem);
          console.log(`  ✅ Added task ${taskItem.task_id} (${taskItem.type})`);
        }
      } else {
        console.log(`  ⚠️  Task file ${taskFile} has no task data`);
      }
    } else {
      console.log(`  ⚠️  Task file not found: ${taskFile}`);
    }
  }

  // Sort tasks by task_id
  dayData.tasks.sort((a, b) => (a.task_id || 0) - (b.task_id || 0));

  return dayData;
}

// Import single lesson
async function importLesson(dayNumber, yamlData) {
  try {
    const dayInfo = yamlData.day || {};
    
    // Handle title and subtitle - can be string or object with ru/en
    const titleRu = typeof dayInfo.title === 'string' ? dayInfo.title : (dayInfo.title?.ru || '');
    const titleEn = typeof dayInfo.title === 'string' ? (dayInfo.title_en || dayInfo.title || '') : (dayInfo.title?.en || titleRu);
    const titlePt = typeof dayInfo.title === 'string' ? (dayInfo.title_pt || dayInfo.title || '') : (dayInfo.title?.pt || titleRu);
    
    const subtitleRu = typeof dayInfo.subtitle === 'string' ? dayInfo.subtitle : (dayInfo.subtitle?.ru || null);
    const subtitleEn = typeof dayInfo.subtitle === 'string' ? (dayInfo.subtitle_en || dayInfo.subtitle || null) : (dayInfo.subtitle?.en || subtitleRu);
    const subtitlePt = typeof dayInfo.subtitle === 'string' ? (dayInfo.subtitle_pt || dayInfo.subtitle || null) : (dayInfo.subtitle?.pt || subtitleRu);
    
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
          title_ru: titleRu,
          title_en: titleEn,
          title_pt: titlePt,
          subtitle_ru: subtitleRu,
          subtitle_en: subtitleEn,
          subtitle_pt: subtitlePt,
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
          title_ru: titleRu,
          title_en: titleEn,
          title_pt: titlePt,
          subtitle_ru: subtitleRu,
          subtitle_en: subtitleEn,
          subtitle_pt: subtitlePt,
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

  // Get day number from command line argument or import all
  const dayNumberArg = process.argv[2];
  
  let dayNumbers = [];
  if (dayNumberArg) {
    const dayNum = parseInt(dayNumberArg);
    if (isNaN(dayNum)) {
      console.error(`❌ Invalid day number: ${dayNumberArg}`);
      process.exit(1);
    }
    dayNumbers = [dayNum];
  } else {
    // Import all lessons found in Subsription directory
    const subsDir = LESSONS_BASE_DIR;
    if (!fs.existsSync(subsDir)) {
      console.error(`❌ Directory not found: ${subsDir}`);
      process.exit(1);
    }
    
    const dirs = fs.readdirSync(subsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && /^\d+ Day$/.test(dirent.name))
      .map(dirent => {
        const match = dirent.name.match(/^(\d+) Day$/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(num => num !== null)
      .sort((a, b) => a - b);
    
    dayNumbers = dirs;
  }

  if (dayNumbers.length === 0) {
    console.error(`❌ No lesson directories found in ${LESSONS_BASE_DIR}`);
    process.exit(1);
  }

  console.log(`📁 Found ${dayNumbers.length} lesson(s) to import\n`);

  let imported = 0;
  let errors = 0;

  for (const dayNumber of dayNumbers) {
    console.log(`📖 Processing lesson ${dayNumber}...`);
    
    const yamlData = loadLessonFiles(dayNumber);

    if (!yamlData) {
      console.error(`❌ Failed to load lesson ${dayNumber}`);
      errors++;
      continue;
    }

    if (!yamlData.day?.number) {
      console.error(`❌ No day number found in lesson ${dayNumber}`);
      errors++;
      continue;
    }

    const success = await importLesson(dayNumber, yamlData);
    if (success) {
      imported++;
      console.log(`   Tasks: ${yamlData.tasks?.length || 0}\n`);
    } else {
      errors++;
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Errors: ${errors}`);
}

main().catch(console.error);






