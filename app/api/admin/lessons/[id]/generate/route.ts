import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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
      .in('type', ['course', 'lesson', 'vocabulary']);

    if (methodologiesError) {
      console.error('Error loading methodologies:', methodologiesError);
      return NextResponse.json(
        { error: 'Failed to load methodologies' },
        { status: 500 }
      );
    }

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

    // Step 5: Build system prompt
    const systemPrompt = buildSystemPrompt(
      courseMethodology,
      lessonMethodology,
      usedWords,
      dayNumber,
      phase,
      topic_ru,
      topic_en,
      exampleLesson
    );

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

    // Step 7: Update lesson in database
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

// Build system prompt
function buildSystemPrompt(
  courseMethodology: string,
  lessonMethodology: string,
  usedWords: string[],
  dayNumber: number,
  phase: string,
  topicRu: string,
  topicEn: string,
  exampleLesson: any
): string {
  const exampleJson = exampleLesson ? JSON.stringify(exampleLesson, null, 2) : 'No example available';

  return `You are an AI lesson generator for FaloClaro, a Portuguese language learning course.

## COURSE METHODOLOGY
${courseMethodology}

## LESSON METHODOLOGY
${lessonMethodology}

## ALREADY USED WORDS (DO NOT USE THESE)
${usedWords.length > 0 ? usedWords.join(', ') : 'None yet'}

## LESSON PARAMETERS
- Day: ${dayNumber}
- Phase: ${phase}
- Topic (RU): ${topicRu}
- Topic (EN): ${topicEn}

## PLATFORM STRUCTURE

Each lesson must have exactly 5 tasks:

1. **TASK 1 - Vocabulary (type: "vocabulary")**
   - Contains cards with: word (PT), word_translation_ru, word_translation_en, transcription (optional), example_sentence (PT), sentence_translation_ru, sentence_translation_en
   - Structure: { task_id: 1, type: "vocabulary", content: { cards: [...] }, ui: {...}, completion_rule: "..." }

2. **TASK 2 - Rules (type: "rules")**
   - Contains blocks: explanation, comparison, reinforcement, speak_out_loud
   - Each block can have examples, hints, tasks, etc.
   - Structure: { task_id: 2, type: "rules", blocks: [...] }

3. **TASK 3 - Listening (type: "listening")**
   - Contains items with: audio_text (PT), question (RU/EN), options (PT), correct answer
   - Structure: { task_id: 3, type: "listening", items: [...] }

4. **TASK 4 - Attention (type: "attention")**
   - Similar to listening but with attention checking
   - Structure: { task_id: 4, type: "attention", items: [...] }

5. **TASK 5 - Writing (type: "writing")**
   - Contains template forms and practice
   - Structure: { task_id: 5, type: "writing", main_task: { format: "...", template: [...] } }

## EXAMPLE LESSON (Day 4)
${exampleJson.substring(0, 5000)}${exampleJson.length > 5000 ? '...' : ''}

## YOUR TASK

Generate a complete lesson JSON matching the structure above:
- Use ONLY words NOT in the used_words list
- Match the phase level (${phase})
- Be creative - vary the number of blocks, examples, items
- Return ONLY valid JSON object, no markdown, no explanations
- The JSON must be parseable and valid`;
}

