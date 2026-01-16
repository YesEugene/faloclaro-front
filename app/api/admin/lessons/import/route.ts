import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const lessonId = formData.get('lessonId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      );
    }

    // Read file content
    const fileContent = await file.text();
    let lessonData: any;

    // Try to parse as JSON first, then as YAML
    try {
      lessonData = JSON.parse(fileContent);
    } catch (jsonError) {
      // If JSON parsing fails, try YAML
      try {
        const yaml = require('js-yaml');
        lessonData = yaml.load(fileContent) as any;
      } catch (yamlError) {
        return NextResponse.json(
          { error: 'File must be valid JSON or YAML format', details: (yamlError as Error).message },
          { status: 400 }
        );
      }
    }

    // Validate lesson data structure
    if (!lessonData.day && !lessonData.title_ru && !lessonData.title_en) {
      return NextResponse.json(
        { error: 'Invalid lesson format. File must contain lesson data with day information or titles.' },
        { status: 400 }
      );
    }

    // Extract lesson metadata
    let dayNumber: number | null = null;
    let titleRu = '';
    let titleEn = '';
    let titlePt = '';
    let subtitleRu = '';
    let subtitleEn = '';
    let subtitlePt = '';
    let estimatedTime = '';

    // Support both old YAML format (day.title) and new format (title_ru, title_en)
    if (lessonData.day) {
      // Support both day.number and day.day_number
      dayNumber = lessonData.day.day_number || lessonData.day.number || null;
      titleRu = typeof lessonData.day.title === 'string' 
        ? lessonData.day.title 
        : lessonData.day.title?.ru || '';
      titleEn = typeof lessonData.day.title === 'string' 
        ? '' 
        : lessonData.day.title?.en || '';
      titlePt = typeof lessonData.day.title === 'string'
        ? ''
        : lessonData.day.title?.pt || '';
      subtitleRu = typeof lessonData.day.subtitle === 'string' 
        ? lessonData.day.subtitle 
        : lessonData.day.subtitle?.ru || '';
      subtitleEn = typeof lessonData.day.subtitle === 'string' 
        ? '' 
        : lessonData.day.subtitle?.en || '';
      subtitlePt = typeof lessonData.day.subtitle === 'string'
        ? ''
        : lessonData.day.subtitle?.pt || '';
      estimatedTime = lessonData.day.estimated_time || '';
    } else {
      // New format (direct fields or day_number at top level)
      dayNumber = lessonData.day_number || lessonData.number || null;
      titleRu = lessonData.title_ru || '';
      titleEn = lessonData.title_en || '';
      titlePt = lessonData.title_pt || '';
      subtitleRu = lessonData.subtitle_ru || '';
      subtitleEn = lessonData.subtitle_en || '';
      subtitlePt = lessonData.subtitle_pt || '';
      estimatedTime = lessonData.estimated_time || '';
    }

    // title_pt is required (NOT NULL), so use title_en or title_ru as fallback if not provided
    if (!titlePt || !titlePt.trim()) {
      titlePt = titleEn && titleEn.trim() ? titleEn.trim() : (titleRu && titleRu.trim() ? titleRu.trim() : '');
    }

    // Prepare yaml_content (store the entire lesson structure)
    // Normalize day structure to use day_number instead of number
    let normalizedDay = lessonData.day;
    if (normalizedDay && normalizedDay.number && !normalizedDay.day_number) {
      normalizedDay = {
        ...normalizedDay,
        day_number: normalizedDay.number,
      };
      // Remove number if day_number is set
      const { number, ...dayWithoutNumber } = normalizedDay;
      normalizedDay = dayWithoutNumber;
    }
    
    const normalizeOptionCorrectnessInPlace = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      const options = obj.options;
      if (!Array.isArray(options)) return;
      for (const opt of options) {
        if (!opt || typeof opt !== 'object') continue;
        if (opt.is_correct !== undefined && opt.correct === undefined) {
          opt.correct = !!opt.is_correct;
        }
        if (opt.correct !== undefined && opt.is_correct === undefined) {
          opt.is_correct = !!opt.correct;
        }
      }
    };

    // Normalize tasks structure - keep original structure but fix common issues
    const normalizedTasks = (lessonData.tasks || []).map((task: any) => {
      const normalizedTask = { ...task };
      
      // Fix attention task - ensure it has audio field if it has text
      if (normalizedTask.type === 'attention') {
        if (normalizedTask.items && Array.isArray(normalizedTask.items)) {
          normalizedTask.items = normalizedTask.items.map((item: any) => {
            // If item has 'text' but no 'audio', use text as audio
            if (item.text && !item.audio) {
              return {
                ...item,
                audio: item.text,
                // Keep text for backward compatibility, but audio is required
              };
            }
            return item;
          });

          // Fix correctness flag naming for admin UI checkboxes
          normalizedTask.items.forEach((item: any) => normalizeOptionCorrectnessInPlace(item));
        }
      }

      // Fix correctness flag naming for listening task items
      if (normalizedTask.type === 'listening_comprehension' || normalizedTask.type === 'listening') {
        if (normalizedTask.items && Array.isArray(normalizedTask.items)) {
          normalizedTask.items.forEach((item: any) => normalizeOptionCorrectnessInPlace(item));
        }
      }

      // Fix correctness flag naming for rules reinforcement block
      if (normalizedTask.type === 'rules' && Array.isArray(normalizedTask.blocks)) {
        normalizedTask.blocks.forEach((block: any) => {
          if (!block || typeof block !== 'object') return;
          if (block.block_type !== 'reinforcement') return;
          const c = block.content || {};
          if (c.task_1) normalizeOptionCorrectnessInPlace(c.task_1);
          if (c.task_2) normalizeOptionCorrectnessInPlace(c.task_2);
        });
      }
      
      // Note: Listening tasks with 'questions' array are kept as-is
      // The CRM editor will handle the conversion if needed
      
      return normalizedTask;
    });
    
    const yamlContent: any = {
      day: normalizedDay || {
        day_number: dayNumber,
        title: { ru: titleRu, en: titleEn },
        subtitle: { ru: subtitleRu, en: subtitleEn },
        estimated_time: estimatedTime,
      },
      tasks: normalizedTasks,
    };

    if (lessonId) {
      // Update existing lesson
      const supabaseAdmin = getSupabaseAdmin();
      const { data: existingLesson } = await supabaseAdmin
        .from('lessons')
        .select('day_number')
        .eq('id', lessonId)
        .single();

      if (!existingLesson) {
        return NextResponse.json(
          { error: 'Lesson not found' },
          { status: 404 }
        );
      }

      // Prepare update data - only include subtitle fields if they have values (optional fields)
      // title_pt is required (NOT NULL), so use title_en or title_ru as fallback
      const titlePtValue = titlePt && titlePt.trim() 
        ? titlePt.trim() 
        : (titleEn && titleEn.trim() ? titleEn.trim() : (titleRu && titleRu.trim() ? titleRu.trim() : ''));

      const updateData: any = {
        yaml_content: yamlContent,
        title_ru: titleRu && titleRu.trim() ? titleRu.trim() : null,
        title_en: titleEn && titleEn.trim() ? titleEn.trim() : null,
        title_pt: titlePtValue, // Required field - use provided value or fallback to EN/RU
        updated_at: new Date().toISOString(),
      };
      
      // Only include subtitle fields if they have values (optional fields)
      if (subtitleRu && subtitleRu.trim()) {
        updateData.subtitle_ru = subtitleRu.trim();
      } else {
        updateData.subtitle_ru = null; // Clear subtitle if empty
      }
      if (subtitleEn && subtitleEn.trim()) {
        updateData.subtitle_en = subtitleEn.trim();
      } else {
        updateData.subtitle_en = null; // Clear subtitle if empty
      }
      if (subtitlePt && subtitlePt.trim()) {
        updateData.subtitle_pt = subtitlePt.trim();
      } else {
        updateData.subtitle_pt = null; // Clear subtitle if empty
      }

      const { data: updatedLesson, error: updateError } = await supabaseAdmin
        .from('lessons')
        .update(updateData)
        .eq('id', lessonId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating lesson:', updateError);
        return NextResponse.json(
          { error: 'Failed to update lesson', details: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        lesson: updatedLesson,
        message: 'Lesson updated successfully',
      });
    } else {
      // Create new lesson
      if (!dayNumber) {
        return NextResponse.json(
          { error: 'day_number is required for new lessons' },
          { status: 400 }
        );
      }

      // Check if lesson with this day_number already exists (use admin client for RLS bypass)
      const supabaseAdmin = getSupabaseAdmin();
      const { data: existingLesson } = await supabaseAdmin
        .from('lessons')
        .select('id')
        .eq('day_number', dayNumber)
        .single();

      if (existingLesson) {
        return NextResponse.json(
          { error: `Lesson with day_number ${dayNumber} already exists. Use lessonId to update it.` },
          { status: 400 }
        );
      }

      // Prepare insert data - use null for empty optional fields
      // title_pt is required (NOT NULL), so use title_en or title_ru as fallback
      const titlePtValue = titlePt && titlePt.trim() 
        ? titlePt.trim() 
        : (titleEn && titleEn.trim() ? titleEn.trim() : (titleRu && titleRu.trim() ? titleRu.trim() : ''));

      const insertData: any = {
        day_number: dayNumber,
        title_ru: titleRu && titleRu.trim() ? titleRu.trim() : null,
        title_en: titleEn && titleEn.trim() ? titleEn.trim() : null,
        title_pt: titlePtValue, // Required field - use provided value or fallback to EN/RU
        yaml_content: yamlContent,
        is_published: false, // New lessons are not published by default
      };
      
      // Only include subtitle fields if they have values (optional fields)
      if (subtitleRu && subtitleRu.trim()) {
        insertData.subtitle_ru = subtitleRu.trim();
      }
      if (subtitleEn && subtitleEn.trim()) {
        insertData.subtitle_en = subtitleEn.trim();
      }
      if (subtitlePt && subtitlePt.trim()) {
        insertData.subtitle_pt = subtitlePt.trim();
      }

      const { data: newLesson, error: createError } = await supabaseAdmin
        .from('lessons')
        .insert(insertData)
        .select()
        .single();

      if (createError) {
        console.error('Error creating lesson:', createError);
        console.error('Lesson data:', {
          day_number: dayNumber,
          title_ru: titleRu,
          title_en: titleEn,
          yaml_content_keys: Object.keys(yamlContent),
          tasks_count: yamlContent.tasks?.length || 0,
        });
        return NextResponse.json(
          { 
            error: 'Failed to create lesson', 
            details: createError.message,
            code: createError.code,
            hint: createError.hint,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        lesson: newLesson,
        message: 'Lesson imported successfully',
      });
    }
  } catch (error) {
    console.error('Error importing lesson:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to import lesson', 
        details: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
      },
      { status: 500 }
    );
  }
}

