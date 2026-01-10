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

    const supabase = getSupabaseAdmin();

    // Extract lesson metadata
    let dayNumber: number | null = null;
    let titleRu = '';
    let titleEn = '';
    let subtitleRu = '';
    let subtitleEn = '';
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
      subtitleRu = typeof lessonData.day.subtitle === 'string' 
        ? lessonData.day.subtitle 
        : lessonData.day.subtitle?.ru || '';
      subtitleEn = typeof lessonData.day.subtitle === 'string' 
        ? '' 
        : lessonData.day.subtitle?.en || '';
      estimatedTime = lessonData.day.estimated_time || '';
    } else {
      // New format (direct fields or day_number at top level)
      dayNumber = lessonData.day_number || lessonData.number || null;
      titleRu = lessonData.title_ru || '';
      titleEn = lessonData.title_en || '';
      subtitleRu = lessonData.subtitle_ru || '';
      subtitleEn = lessonData.subtitle_en || '';
      estimatedTime = lessonData.estimated_time || '';
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
        }
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
      const { data: existingLesson } = await supabase
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
      const updateData: any = {
        yaml_content: yamlContent,
        title_ru: titleRu || null,
        title_en: titleEn || null,
        updated_at: new Date().toISOString(),
      };
      
      // Only include subtitle fields if they have values (optional fields)
      if (subtitleRu && subtitleRu.trim()) {
        updateData.subtitle_ru = subtitleRu;
      } else {
        updateData.subtitle_ru = null; // Clear subtitle if empty
      }
      if (subtitleEn && subtitleEn.trim()) {
        updateData.subtitle_en = subtitleEn;
      } else {
        updateData.subtitle_en = null; // Clear subtitle if empty
      }

      const { data: updatedLesson, error: updateError } = await supabase
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

      // Check if lesson with this day_number already exists
      const { data: existingLesson } = await supabase
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
      const insertData: any = {
        day_number: dayNumber,
        title_ru: titleRu || null,
        title_en: titleEn || null,
        yaml_content: yamlContent,
        is_published: false, // New lessons are not published by default
      };
      
      // Only include subtitle fields if they have values (optional fields)
      if (subtitleRu && subtitleRu.trim()) {
        insertData.subtitle_ru = subtitleRu;
      }
      if (subtitleEn && subtitleEn.trim()) {
        insertData.subtitle_en = subtitleEn;
      }

      const { data: newLesson, error: createError } = await supabase
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

