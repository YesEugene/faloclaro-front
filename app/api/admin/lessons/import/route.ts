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
      dayNumber = lessonData.day.day_number || null;
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
      // New format
      dayNumber = lessonData.day_number || null;
      titleRu = lessonData.title_ru || '';
      titleEn = lessonData.title_en || '';
      subtitleRu = lessonData.subtitle_ru || '';
      subtitleEn = lessonData.subtitle_en || '';
      estimatedTime = lessonData.estimated_time || '';
    }

    // Prepare yaml_content (store the entire lesson structure)
    const yamlContent: any = {
      day: lessonData.day || {
        day_number: dayNumber,
        title: { ru: titleRu, en: titleEn },
        subtitle: { ru: subtitleRu, en: subtitleEn },
        estimated_time: estimatedTime,
      },
      tasks: lessonData.tasks || [],
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

      const { data: updatedLesson, error: updateError } = await supabase
        .from('lessons')
        .update({
          yaml_content: yamlContent,
          title_ru: titleRu,
          title_en: titleEn,
          subtitle_ru: subtitleRu,
          subtitle_en: subtitleEn,
          updated_at: new Date().toISOString(),
        })
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

      const { data: newLesson, error: createError } = await supabase
        .from('lessons')
        .insert({
          day_number: dayNumber,
          title_ru: titleRu,
          title_en: titleEn,
          subtitle_ru: subtitleRu,
          subtitle_en: subtitleEn,
          yaml_content: yamlContent,
          is_published: false, // New lessons are not published by default
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating lesson:', createError);
        return NextResponse.json(
          { error: 'Failed to create lesson', details: createError.message },
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
    return NextResponse.json(
      { error: 'Failed to import lesson', details: (error as Error).message },
      { status: 500 }
    );
  }
}

