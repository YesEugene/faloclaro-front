import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildLessonGenerationPrompt } from '@/lib/lesson-generation-prompt';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper function to fix JSON
function fixJson(jsonString: string): string {
  try {
    // Remove markdown code blocks if present
    jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    
    // Try to fix common issues
    // Fix unescaped quotes in strings
    jsonString = jsonString.replace(/([{,]\s*"[^"]*":\s*")([^"]*)(")([,}])/g, (match, p1, p2, p3, p4) => {
      return p1 + p2.replace(/"/g, '\\"') + p3 + p4;
    });
    
    // Fix trailing commas
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    return jsonString.trim();
  } catch (e) {
    return jsonString;
  }
}

// Helper function to parse JSON with error handling
function parseJsonSafely(jsonString: string): any {
  try {
    // First, try to parse as-is
    return JSON.parse(jsonString);
  } catch (e) {
    // Try to fix and parse again
    const fixed = fixJson(jsonString);
    try {
      return JSON.parse(fixed);
    } catch (e2) {
      throw new Error(`Invalid JSON: ${e2 instanceof Error ? e2.message : 'Unknown error'}`);
    }
  }
}

// POST - Generate lesson using AI
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { topic_ru, topic_en } = body;

    if (!topic_ru || !topic_en) {
      return NextResponse.json(
        { error: 'topic_ru and topic_en are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Step 1: Get lesson data
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, day_number, yaml_content')
      .eq('id', id)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const dayNumber = lesson.day_number || 1;

    // Step 2: Determine phase
    const getPhase = (day: number): string => {
      if (day <= 10) return 'A1';
      if (day <= 30) return 'A2';
      if (day <= 50) return 'B1';
      return 'B2';
    };

    const phase = getPhase(dayNumber);

    // Step 3: Load methodologies
    const { data: methodologies, error: methodologiesError } = await supabase
      .from('admin_methodologies')
      .select('type, content')
      .in('type', ['course', 'lesson', 'vocabulary', 'generation_prompt']);

    if (methodologiesError) {
      console.error('Error loading methodologies:', methodologiesError);
      return NextResponse.json(
        { error: 'Failed to load methodologies' },
        { status: 500 }
      );
    }

    // Check if custom generation prompt exists
    const customPrompt = methodologies?.find(m => m.type === 'generation_prompt')?.content;
    
    let systemPrompt: string;
    
    if (customPrompt && customPrompt.trim() && customPrompt !== 'Generation prompt placeholder. This is the full prompt sent to OpenAI for lesson generation. You can customize it here.') {
      // Use custom prompt if provided, but replace placeholders with actual values
      const courseMethodology = methodologies?.find(m => m.type === 'course')?.content || 'Course methodology not set';
      const lessonMethodology = methodologies?.find(m => m.type === 'lesson')?.content || 'Lesson methodology not set';
      
      let usedWords: string[] = [];
      try {
        const vocabContent = methodologies?.find(m => m.type === 'vocabulary')?.content;
        if (vocabContent) {
          const vocab = typeof vocabContent === 'string' ? JSON.parse(vocabContent) : vocabContent;
          usedWords = vocab.used_words || [];
        }
      } catch (e) {
        console.error('Error parsing vocabulary:', e);
      }

      // Replace placeholders in custom prompt
      systemPrompt = customPrompt
        .replace(/\$\{courseMethodology\}/g, courseMethodology)
        .replace(/\$\{lessonMethodology\}/g, lessonMethodology)
        .replace(/\$\{usedWordsList\}/g, usedWords.length > 0 ? usedWords.join(', ') : 'None yet')
        .replace(/\$\{dayNumber\}/g, dayNumber.toString())
        .replace(/\$\{phase\}/g, phase)
        .replace(/\$\{topicRu\}/g, topic_ru)
        .replace(/\$\{topicEn\}/g, topic_en);
    } else {
      // Use default prompt builder
      const courseMethodology = methodologies?.find(m => m.type === 'course')?.content || 'Course methodology not set';
      const lessonMethodology = methodologies?.find(m => m.type === 'lesson')?.content || 'Lesson methodology not set';
      
      let usedWords: string[] = [];
      try {
        const vocabContent = methodologies?.find(m => m.type === 'vocabulary')?.content;
        if (vocabContent) {
          const vocab = typeof vocabContent === 'string' ? JSON.parse(vocabContent) : vocabContent;
          usedWords = vocab.used_words || [];
        }
      } catch (e) {
        console.error('Error parsing vocabulary:', e);
      }

      // Step 4: Get example lesson 4
      let exampleLesson: any = null;
      try {
        const { data: lesson4, error: lesson4Error } = await supabase
          .from('lessons')
          .select('yaml_content')
          .eq('day_number', 4)
          .single();

        if (!lesson4Error && lesson4) {
          exampleLesson = typeof lesson4.yaml_content === 'string' 
            ? JSON.parse(lesson4.yaml_content) 
            : lesson4.yaml_content;
        }
      } catch (e) {
        console.error('Error loading example lesson 4:', e);
        // Continue without example if not found
      }

      // Step 5: Build system prompt using the new detailed prompt builder
      systemPrompt = buildLessonGenerationPrompt(
        courseMethodology,
        lessonMethodology,
        usedWords,
        dayNumber,
        phase,
        topic_ru,
        topic_en,
        exampleLesson
      );
    }

    // Step 6: Generate lesson with OpenAI (with retry logic)
    let generatedLesson: any = null;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Generate a complete lesson JSON for day ${dayNumber}, phase ${phase}, topic "${topic_ru}" / "${topic_en}". Return ONLY valid JSON object, no explanations, no markdown code blocks, no text before or after JSON.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 8000,
        });

        let responseText = completion.choices[0]?.message?.content || '';
        
        if (!responseText) {
          throw new Error('Empty response from OpenAI');
        }

        // Remove markdown code blocks if present
        responseText = responseText.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        
        // Try to find JSON object in response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          responseText = jsonMatch[0];
        }

        // Try to parse JSON
        generatedLesson = parseJsonSafely(responseText);
        
        // Validate structure
        if (!generatedLesson.tasks || !Array.isArray(generatedLesson.tasks) || generatedLesson.tasks.length !== 5) {
          throw new Error('Lesson must have exactly 5 tasks');
        }

        // Validate Task 2 has exactly 6 blocks
        const task2 = generatedLesson.tasks.find((t: any) => t.task_id === 2 && t.type === 'rules');
        if (task2 && (!task2.blocks || !Array.isArray(task2.blocks) || task2.blocks.length !== 6)) {
          throw new Error('Task 2 (Rules) must have exactly 6 blocks');
        }

        // Validate Task 3 has exactly 3 items
        const task3 = generatedLesson.tasks.find((t: any) => t.task_id === 3 && (t.type === 'listening' || t.type === 'listening_comprehension'));
        if (task3 && (!task3.items || !Array.isArray(task3.items) || task3.items.length !== 3)) {
          throw new Error('Task 3 (Listening) must have exactly 3 items');
        }

        // Validate Task 4 has exactly 3 items
        const task4 = generatedLesson.tasks.find((t: any) => t.task_id === 4 && t.type === 'attention');
        if (task4 && (!task4.items || !Array.isArray(task4.items) || task4.items.length !== 3)) {
          throw new Error('Task 4 (Attention) must have exactly 3 items');
        }

        // Normalize and validate tasks structure
        generatedLesson.tasks = generatedLesson.tasks
          .filter((task: any) => task && typeof task === 'object') // Remove null/undefined tasks
          .map((task: any, index: number) => {
            // Ensure task_id is set (use index + 1 if missing)
            if (!task.task_id) {
              task.task_id = index + 1;
            }
            
            // Convert "writing" to "writing_optional" (frontend expects writing_optional)
            if (task.type === 'writing') {
              task.type = 'writing_optional';
            }
            // Convert "listening" to "listening_comprehension" (frontend expects listening_comprehension)
            if (task.type === 'listening') {
              task.type = 'listening_comprehension';
            }
            
            // Normalize Task 5 (writing) structure to match frontend expectations
            if (task.type === 'writing_optional' && task.task_id === 5) {
              // Normalize instruction: convert { ru: "...", en: "..." } to { text: { ru: "...", en: "..." } }
              if (task.instruction && typeof task.instruction === 'object' && !task.instruction.text) {
                if (task.instruction.ru || task.instruction.en) {
                  task.instruction = {
                    text: {
                      ru: task.instruction.ru || '',
                      en: task.instruction.en || ''
                    }
                  };
                }
              }
              
              // Normalize template: ensure it's an array of strings with "___" for blanks
              if (task.main_task && Array.isArray(task.main_task.template)) {
                const templateArray = task.main_task.template;
                // Check if template is array of objects (old format) or strings (new format)
                if (templateArray.length > 0 && typeof templateArray[0] === 'object') {
                  // Convert [{ type: "text", content: "..." }, { type: "input", placeholder: "..." }] to strings with ___
                  let currentString = '';
                  const result: string[] = [];
                  templateArray.forEach((item: any) => {
                    if (item.type === 'text') {
                      currentString += (item.content || '');
                    } else if (item.type === 'input') {
                      currentString += '___';
                    }
                    // If we hit a new line or end, save current string
                    if (item.newline || item === templateArray[templateArray.length - 1]) {
                      if (currentString.trim()) {
                        result.push(currentString.trim());
                        currentString = '';
                      }
                    }
                  });
                  if (currentString.trim()) {
                    result.push(currentString.trim());
                  }
                  task.main_task.template = result.length > 0 ? result : ['___'];
                }
                // If already strings, ensure they have ___ for blanks
                task.main_task.template = task.main_task.template.map((t: string) => {
                  if (typeof t === 'string' && !t.includes('___')) {
                    // If no blanks, add one at the end
                    return t + ' ___';
                  }
                  return t;
                });
              }
              
              // Ensure hints array exists if template has blanks
              if (task.main_task && Array.isArray(task.main_task.template)) {
                const totalBlanks = task.main_task.template.reduce((count: number, t: string) => {
                  return count + (t.match(/___/g) || []).length;
                }, 0);
                if (totalBlanks > 0 && (!task.main_task.hints || task.main_task.hints.length === 0)) {
                  // Generate placeholder hints if missing
                  task.main_task.hints = Array(totalBlanks).fill('word');
                }
              }
              
              // Normalize example: convert { text: "...", show_button: true } to { content: ["..."], show_by_button: true, button_text: { ru: "...", en: "..." } }
              if (task.example && typeof task.example === 'object') {
                if (task.example.text && !task.example.content) {
                  // Convert single text string to array
                  task.example.content = [task.example.text];
                }
                if (task.example.show_button !== undefined && task.example.show_by_button === undefined) {
                  task.example.show_by_button = task.example.show_button;
                }
                if (!task.example.button_text) {
                  task.example.button_text = {
                    ru: 'Показать пример',
                    en: 'Show example'
                  };
                }
              }
            }
            
            // Ensure is_correct is set for all choice-based tasks
            // Task 3 (listening) - normalize options to have ru/en structure
            if (task.type === 'listening_comprehension' && task.items) {
              task.items.forEach((item: any) => {
                if (item.options && Array.isArray(item.options)) {
                  item.options.forEach((opt: any) => {
                    // Convert old string format to new object format
                    if (typeof opt.text === 'string') {
                      opt.text = { ru: opt.text, en: '' };
                    } else if (!opt.text || typeof opt.text !== 'object') {
                      opt.text = { ru: '', en: '' };
                    }
                    // Ensure both ru and en exist
                    if (!opt.text.ru) opt.text.ru = '';
                    if (!opt.text.en) opt.text.en = '';
                  });
                  
                  const correctCount = item.options.filter((opt: any) => opt.is_correct === true || opt.correct === true).length;
                  if (correctCount === 0) {
                    // If no correct answer set, set first option as correct
                    if (item.options.length > 0) {
                      item.options[0].is_correct = true;
                      item.options[0].correct = true;
                    }
                  }
                }
              });
            }
            
            // Task 4 (attention)
            if (task.type === 'attention' && task.items) {
              task.items.forEach((item: any) => {
                if (item.options && Array.isArray(item.options)) {
                  const correctCount = item.options.filter((opt: any) => opt.is_correct === true).length;
                  if (correctCount === 0) {
                    // If no correct answer set, set first option as correct
                    if (item.options.length > 0) {
                      item.options[0].is_correct = true;
                    }
                  }
                }
              });
            }
            
            // Task 2 block_5_reinforcement - ensure is_correct is set
            if (task.type === 'rules' && task.blocks) {
              task.blocks.forEach((block: any) => {
                if (block.block_type === 'reinforcement' && block.content) {
                  ['task_1', 'task_2'].forEach((taskKey: string) => {
                    const reinforcementTask = block.content[taskKey];
                    if (reinforcementTask && reinforcementTask.options && Array.isArray(reinforcementTask.options)) {
                      const correctCount = reinforcementTask.options.filter((opt: any) => opt.is_correct === true).length;
                      if (correctCount === 0) {
                        // If no correct answer set, set first option as correct
                        if (reinforcementTask.options.length > 0) {
                          reinforcementTask.options[0].is_correct = true;
                        }
                      }
                    }
                  });
                }
              });
            }
            
            return task;
          })
          .sort((a: any, b: any) => (a.task_id || 0) - (b.task_id || 0)); // Sort by task_id
        
        // Ensure we have exactly 5 tasks with task_id 1-5
        if (generatedLesson.tasks.length !== 5) {
          throw new Error(`Expected 5 tasks, got ${generatedLesson.tasks.length}`);
        }
        
        // Validate all tasks have required fields
        for (let i = 0; i < generatedLesson.tasks.length; i++) {
          const task = generatedLesson.tasks[i];
          if (!task.task_id || task.task_id !== i + 1) {
            throw new Error(`Task at index ${i} has incorrect task_id: ${task.task_id}, expected ${i + 1}`);
          }
          if (!task.type) {
            throw new Error(`Task ${task.task_id} is missing type field`);
          }
        }

        // Success!
        break;
      } catch (error: any) {
        lastError = error;
        console.error(`Generation attempt ${attempt + 1} failed:`, error);
        
        if (attempt === 0) {
          // Retry with stricter instructions
          continue;
        } else {
          // Both attempts failed
          throw new Error(`Failed to generate valid lesson after 2 attempts: ${error.message}`);
        }
      }
    }

    if (!generatedLesson) {
      throw lastError || new Error('Failed to generate lesson');
    }

    // Step 7: Ensure tasks array is at top level (not nested in day)
    // Frontend expects: yaml_content.tasks (not yaml_content.day.tasks)
    if (generatedLesson.day && generatedLesson.day.tasks && !generatedLesson.tasks) {
      generatedLesson.tasks = generatedLesson.day.tasks;
    }
    
    // Ensure tasks array exists and is valid
    if (!generatedLesson.tasks || !Array.isArray(generatedLesson.tasks)) {
      throw new Error('Generated lesson must have a tasks array at top level');
    }
    
    // Log final structure for debugging
    console.log('✅ Final lesson structure:', {
      hasTasks: !!generatedLesson.tasks,
      tasksCount: generatedLesson.tasks.length,
      tasks: generatedLesson.tasks.map((t: any) => ({
        task_id: t.task_id,
        type: t.type,
        hasTitle: !!t.title
      }))
    });

    // Step 8: Update lesson in database
    const { data: updatedLesson, error: updateError } = await supabase
      .from('lessons')
      .update({
        yaml_content: generatedLesson,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating lesson:', updateError);
      return NextResponse.json(
        { error: 'Failed to save generated lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson: updatedLesson,
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/lessons/[id]/generate:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Note: buildSystemPrompt function has been moved to lib/lesson-generation-prompt.ts
// This function is kept for backward compatibility but now uses the new prompt builder

