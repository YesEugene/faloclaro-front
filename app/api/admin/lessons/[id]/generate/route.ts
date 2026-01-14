import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { buildLessonGenerationPrompt } from '@/lib/lesson-generation-prompt';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function normalizeWordForComparison(input: unknown): string {
  if (typeof input !== 'string') return '';
  const lowered = input.toLowerCase().trim();
  // Remove diacritics (Hoje === hoje; amanhã === amanha)
  const noDiacritics = lowered.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Keep letters/numbers/spaces only, collapse whitespace
  const lettersNumbersSpaces = noDiacritics.replace(/[^\p{L}\p{N}]+/gu, ' ');
  return lettersNumbersSpaces.replace(/\s+/g, ' ').trim();
}

function getTask1VocabularyWords(lesson: any): string[] {
  const tasks = Array.isArray(lesson?.tasks) ? lesson.tasks : [];
  const t1 = tasks.find((t: any) => t?.task_id === 1 && t?.type === 'vocabulary');
  const cards = Array.isArray(t1?.content?.cards) ? t1.content.cards : [];
  return cards
    .map((c: any) => (typeof c?.word === 'string' ? c.word.trim() : ''))
    .filter((w: string) => w.length > 0);
}

function validateVocabularyIsNewOrThrow(generatedLesson: any, usedWords: string[]) {
  const lessonWords = getTask1VocabularyWords(generatedLesson);

  if (lessonWords.length < 13) {
    throw new Error(`Task 1 vocabulary must have at least 13 cards. Got ${lessonWords.length}.`);
  }

  const forbidden = new Set((usedWords || []).map(normalizeWordForComparison).filter(Boolean));
  const normalized = lessonWords.map(normalizeWordForComparison).filter(Boolean);

  // Internal duplicates inside the lesson
  const counts = new Map<string, number>();
  for (const w of normalized) counts.set(w, (counts.get(w) || 0) + 1);
  const internalDuplicates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([w]) => w);

  // Overlaps with global vocabulary (previous lessons)
  const overlaps = Array.from(new Set(normalized.filter((w) => forbidden.has(w))));

  if (internalDuplicates.length > 0 || overlaps.length > 0) {
    const details = [
      internalDuplicates.length > 0 ? `Internal duplicates in Task 1: ${internalDuplicates.join(', ')}` : null,
      overlaps.length > 0 ? `Words already used in previous lessons (forbidden): ${overlaps.join(', ')}` : null,
    ]
      .filter(Boolean)
      .join('. ');
    throw new Error(`Vocabulary uniqueness violation. ${details}`);
  }
}

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
    // Used to enforce server-side "no reused vocabulary across lessons" regardless of prompt quality
    let usedWordsForValidation: string[] = [];
    
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
      usedWordsForValidation = usedWords;

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
      usedWordsForValidation = usedWords;

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
        const retryContext =
          attempt > 0 && lastError
            ? `\n\nIMPORTANT: Your previous output was INVALID.\nReason: ${lastError.message}\nYou MUST regenerate the ENTIRE lesson JSON.\nCRITICAL: Task 1 vocabulary must be 13-15 UNIQUE cards and MUST NOT contain ANY words from usedWordsList (case-insensitive and accent-insensitive; e.g. "Hoje" vs "hoje" are the same).\nUpdate Tasks 2-5 accordingly to match the new vocabulary.\n`
            : '';

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: `Generate a complete lesson JSON for day ${dayNumber}, phase ${phase}, topic "${topic_ru}" / "${topic_en}". Return ONLY valid JSON object, no explanations, no markdown code blocks, no text before or after JSON.${retryContext}`,
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
        
        // Validate structure - be more lenient to avoid blocking valid lessons
        if (!generatedLesson.tasks || !Array.isArray(generatedLesson.tasks)) {
          throw new Error('Lesson must have a tasks array');
        }

        // Log tasks before filtering for debugging
        console.log('📋 Tasks before validation:', generatedLesson.tasks.map((t: any) => ({
          task_id: t?.task_id,
          type: t?.type,
          hasTitle: !!t?.title
        })));

        // Filter out null/undefined tasks but keep all valid tasks
        const validTasks = generatedLesson.tasks.filter((task: any) => task && typeof task === 'object');
        
        if (validTasks.length < 5) {
          console.warn(`⚠️ Only ${validTasks.length} valid tasks found, expected 5`);
          // Don't throw error here, let normalization handle it
        }

        // Validate Task 2 has exactly 6 blocks (if it exists)
        const task2 = validTasks.find((t: any) => t.task_id === 2 && t.type === 'rules');
        if (task2) {
          if (!task2.blocks || !Array.isArray(task2.blocks) || task2.blocks.length !== 6) {
            console.warn(`⚠️ Task 2 has ${task2.blocks?.length || 0} blocks, expected 6`);
            // Don't throw error, continue with what we have
          }
        }

        // Validate Task 3 has exactly 3 items (if it exists)
        const task3 = validTasks.find((t: any) => t.task_id === 3 && (t.type === 'listening' || t.type === 'listening_comprehension'));
        if (task3) {
          if (!task3.items || !Array.isArray(task3.items) || task3.items.length !== 3) {
            console.warn(`⚠️ Task 3 has ${task3.items?.length || 0} items, expected 3`);
            // Don't throw error, continue with what we have
          }
        }

        // Validate Task 4 has exactly 3 items (if it exists)
        const task4 = validTasks.find((t: any) => t.task_id === 4 && t.type === 'attention');
        if (task4) {
          if (!task4.items || !Array.isArray(task4.items) || task4.items.length !== 3) {
            console.warn(`⚠️ Task 4 has ${task4.items?.length || 0} items, expected 3`);
            // Don't throw error, continue with what we have
          }
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
            
            // Task 4 (attention) - normalize options and ensure is_correct is set
            if (task.type === 'attention' && task.items) {
              task.items.forEach((item: any) => {
                if (item.options && Array.isArray(item.options)) {
                  item.options.forEach((opt: any) => {
                    // Normalize text to object format if needed
                    if (opt.text && typeof opt.text === 'object' && !Array.isArray(opt.text)) {
                      // Ensure both ru and en exist
                      if (!opt.text.ru) opt.text.ru = '';
                      if (!opt.text.en) opt.text.en = '';
                    }
                    
                    // Normalize: ensure both is_correct and correct are set consistently
                    if (opt.correct !== undefined && opt.is_correct === undefined) {
                      opt.is_correct = opt.correct;
                    }
                    if (opt.is_correct !== undefined && opt.correct === undefined) {
                      opt.correct = opt.is_correct;
                    }
                  });
                  
                  // Check if any option is marked as correct (check BOTH fields)
                  const correctCount = item.options.filter((opt: any) => 
                    opt.is_correct === true || opt.correct === true
                  ).length;
                  
                  if (correctCount === 0) {
                    // If no correct answer set, set first option as correct
                    if (item.options.length > 0) {
                      item.options[0].is_correct = true;
                      item.options[0].correct = true;
                    }
                  } else if (correctCount > 1) {
                    // If multiple correct answers, keep only the first one
                    let foundFirst = false;
                    item.options.forEach((opt: any) => {
                      if (opt.is_correct === true || opt.correct === true) {
                        if (foundFirst) {
                          opt.is_correct = false;
                          opt.correct = false;
                        } else {
                          foundFirst = true;
                          opt.is_correct = true;
                          opt.correct = true;
                        }
                      }
                    });
                  }
                }
              });
            }
            
            // Task 2 blocks - normalize hints and block types
            if (task.type === 'rules' && task.blocks) {
              task.blocks.forEach((block: any) => {
                // Ensure block_3_answers has hints array (MANDATORY)
                if (block.block_id === 'block_3_answers' && block.block_type === 'explanation' && block.content) {
                  // Check if hints exist and are valid
                  const hasHints = block.content.hints && Array.isArray(block.content.hints) && block.content.hints.length > 0;
                  
                  if (!hasHints) {
                    console.warn('⚠️ block_3_answers missing hints - adding default hints');
                    // Generate default hints from examples
                    const examples = block.content.examples || [];
                    if (examples.length > 0) {
                      // Create hints explaining each example
                      block.content.hints = examples.map((ex: any, idx: number) => ({
                        ru: `Пример ${idx + 1}: "${ex.text || ''}" - объяснение значения, новых слов и грамматических конструкций.`,
                        en: `Example ${idx + 1}: "${ex.text || ''}" - explanation of meaning, new words and grammatical constructions.`
                      }));
                    } else {
                      // If no examples, add at least one generic hint
                      block.content.hints = [{
                        ru: 'Объяснение новых слов и грамматических конструкций в примерах. Каждое предложение содержит важную информацию для понимания.',
                        en: 'Explanation of new words and grammatical constructions in examples. Each sentence contains important information for understanding.'
                      }];
                    }
                  } else {
                    // Ensure all hints have both ru and en
                    block.content.hints = block.content.hints.map((hint: any) => {
                      if (typeof hint === 'string') {
                        return { ru: hint, en: hint };
                      } else if (typeof hint === 'object') {
                        return {
                          ru: hint.ru || hint.RU || hint.text || 'Объяснение',
                          en: hint.en || hint.EN || hint.text || 'Explanation'
                        };
                      }
                      return { ru: 'Объяснение', en: 'Explanation' };
                    });
                  }
                }
                
                // Ensure block_1 and block_2 also have hints (if they are explanation blocks)
                if ((block.block_id === 'block_1_build' || block.block_id === 'block_2_transform') && 
                    block.block_type === 'explanation' && block.content) {
                  // Check if hint exists (can be single hint or array)
                  const hasHint = block.content.hint && (
                    Array.isArray(block.content.hint) ? block.content.hint.length > 0 : true
                  );
                  
                  if (!hasHint) {
                    console.warn(`⚠️ ${block.block_id} missing hint - adding default hint`);
                    const examples = block.content.examples || [];
                    if (examples.length > 0) {
                      block.content.hint = [{
                        ru: `Объяснение грамматической конструкции и значения примеров.`,
                        en: `Explanation of grammatical construction and meaning of examples.`
                      }];
                    }
                  }
                }
                
                // Normalize block types to match platform expectations
                if (block.block_id === 'block_4_equivalence' && block.block_type !== 'comparison') {
                  console.warn(`⚠️ block_4_equivalence has type "${block.block_type}", changing to "comparison"`);
                  block.block_type = 'comparison';
                }
                if (block.block_id === 'block_5_reinforcement' && block.block_type !== 'reinforcement') {
                  console.warn(`⚠️ block_5_reinforcement has type "${block.block_type}", changing to "reinforcement"`);
                  block.block_type = 'reinforcement';
                }
                if (block.block_id === 'block_6_speak' && block.block_type !== 'speak_out_loud') {
                  console.warn(`⚠️ block_6_speak has type "${block.block_type}", changing to "speak_out_loud"`);
                  block.block_type = 'speak_out_loud';
                }
                
                // block_5_reinforcement - ensure is_correct is set
                if (block.block_type === 'reinforcement' && block.content) {
                  ['task_1', 'task_2'].forEach((taskKey: string) => {
                    const reinforcementTask = block.content[taskKey];
                    if (reinforcementTask && reinforcementTask.options && Array.isArray(reinforcementTask.options)) {
                      // Normalize: ensure both is_correct and correct are set consistently
                      reinforcementTask.options.forEach((opt: any) => {
                        // If correct is set but is_correct is not, copy it
                        if (opt.correct !== undefined && opt.is_correct === undefined) {
                          opt.is_correct = opt.correct;
                        }
                        // If is_correct is set but correct is not, copy it
                        if (opt.is_correct !== undefined && opt.correct === undefined) {
                          opt.correct = opt.is_correct;
                        }
                      });
                      
                      // Check if any option is marked as correct
                      const correctCount = reinforcementTask.options.filter((opt: any) => 
                        opt.is_correct === true || opt.correct === true
                      ).length;
                      
                      if (correctCount === 0) {
                        // If no correct answer set, set first option as correct
                        if (reinforcementTask.options.length > 0) {
                          reinforcementTask.options[0].is_correct = true;
                          reinforcementTask.options[0].correct = true;
                        }
                      } else if (correctCount > 1) {
                        // If multiple correct answers, keep only the first one
                        let foundFirst = false;
                        reinforcementTask.options.forEach((opt: any) => {
                          if (opt.is_correct === true || opt.correct === true) {
                            if (foundFirst) {
                              opt.is_correct = false;
                              opt.correct = false;
                            } else {
                              foundFirst = true;
                              opt.is_correct = true;
                              opt.correct = true;
                            }
                          }
                        });
                      }
                    }
                  });
                }
              });
            }
            
            return task;
          })
          .sort((a: any, b: any) => (a.task_id || 0) - (b.task_id || 0)); // Sort by task_id

        // CRITICAL: Enforce "no reused vocabulary across lessons" server-side.
        // This prevents OpenAI from reusing Task 1 words even if it ignores the prompt.
        validateVocabularyIsNewOrThrow(generatedLesson, usedWordsForValidation);
        
        // Ensure we have exactly 5 tasks with task_id 1-5
        // If we have fewer than 5, log warning but don't fail
        if (generatedLesson.tasks.length < 5) {
          console.warn(`⚠️ Warning: Only ${generatedLesson.tasks.length} tasks generated, expected 5`);
          console.warn('Tasks found:', generatedLesson.tasks.map((t: any) => ({
            task_id: t?.task_id,
            type: t?.type,
            title: t?.title
          })));
        } else if (generatedLesson.tasks.length > 5) {
          console.warn(`⚠️ Warning: ${generatedLesson.tasks.length} tasks generated, expected 5. Taking first 5.`);
          generatedLesson.tasks = generatedLesson.tasks.slice(0, 5);
        }
        
        // Validate all tasks have required fields
        for (let i = 0; i < generatedLesson.tasks.length; i++) {
          const task = generatedLesson.tasks[i];
          if (!task) {
            console.error(`❌ Task at index ${i} is null or undefined`);
            continue;
          }
          
          // Ensure task_id is set correctly
          if (!task.task_id) {
            task.task_id = i + 1;
            console.warn(`⚠️ Task at index ${i} missing task_id, set to ${i + 1}`);
          } else if (task.task_id !== i + 1) {
            console.warn(`⚠️ Task at index ${i} has task_id ${task.task_id}, expected ${i + 1}. Correcting...`);
            task.task_id = i + 1;
          }
          
          // Ensure type is set
          if (!task.type) {
            console.error(`❌ Task ${task.task_id} is missing type field`);
            // Try to infer type from task_id if missing
            const typeMap: Record<number, string> = {
              1: 'vocabulary',
              2: 'rules',
              3: 'listening_comprehension',
              4: 'attention',
              5: 'writing_optional'
            };
            if (typeMap[task.task_id]) {
              task.type = typeMap[task.task_id];
              console.warn(`⚠️ Task ${task.task_id} missing type, inferred as ${task.type}`);
            }
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

