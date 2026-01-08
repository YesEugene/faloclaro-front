import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * Check if lesson exists and is accessible
 * Used for testing/debugging
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get('day');

    if (!day) {
      return NextResponse.json(
        { error: 'Day parameter is required' },
        { status: 400 }
      );
    }

    const dayNumber = parseInt(day);

    // Get lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('day_number', dayNumber)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Lesson not found', exists: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      day_number: lesson.day_number,
      title_ru: lesson.title_ru,
      title_en: lesson.title_en,
      title_pt: lesson.title_pt,
      has_tasks: !!lesson.yaml_content?.tasks,
      tasks_count: lesson.yaml_content?.tasks?.length || 0,
    });
  } catch (error) {
    console.error('Error checking lesson:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

