import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const levelId = searchParams.get('level_id');
    const forFrontend = searchParams.get('for_frontend') === 'true';

    let query = supabase
      .from('lessons')
      .select('*, levels(id, level_number, name_ru, name_en)')
      .order('day_number', { ascending: true });

    // Filter by level if provided
    if (levelId) {
      query = query.eq('level_id', levelId);
    }

    // For frontend, only show published lessons
    if (forFrontend) {
      query = query.eq('is_published', true);
    }

    const { data: lessons, error } = await query;

    if (error) {
      console.error('Error fetching lessons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    // Transform lessons for frontend if needed
    if (forFrontend && lessons) {
      const { transformLessonForFrontend } = await import('@/lib/lesson-transformer');
      const transformedLessons = lessons.map((lesson: any) => 
        transformLessonForFrontend(lesson)
      );
      return NextResponse.json({
        success: true,
        lessons: transformedLessons,
      });
    }

    return NextResponse.json({
      success: true,
      lessons: lessons || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/lessons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      day_number, 
      title_ru, 
      title_en,
      subtitle_ru,
      subtitle_en,
      yaml_content,
      level_id,
      order_in_level,
      is_published 
    } = body;

    if (!day_number) {
      return NextResponse.json(
        { success: false, error: 'day_number is required' },
        { status: 400 }
      );
    }

    // Check if lesson with this day_number already exists (use admin client for RLS bypass)
    const supabaseAdmin = getSupabaseAdmin();
    const { data: existingLessons, error: checkError } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('day_number', day_number)
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking existing lessons:', checkError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing lessons', details: checkError.message },
        { status: 500 }
      );
    }

    if (existingLessons && existingLessons.length > 0) {
      return NextResponse.json(
        { success: false, error: `Lesson with day_number ${day_number} already exists` },
        { status: 400 }
      );
    }

    // Prepare insert data - handle optional fields correctly
    const insertData: any = {
      day_number,
      title_ru: (title_ru && title_ru.trim()) ? title_ru.trim() : null,
      title_en: (title_en && title_en.trim()) ? title_en.trim() : null,
      yaml_content: yaml_content || {},
      is_published: is_published !== undefined ? is_published : false,
    };

    // Only include subtitle fields if they have values (optional fields)
    if (subtitle_ru && subtitle_ru.trim()) {
      insertData.subtitle_ru = subtitle_ru.trim();
    }
    if (subtitle_en && subtitle_en.trim()) {
      insertData.subtitle_en = subtitle_en.trim();
    }

    // Only include optional fields if they have values
    if (level_id) {
      insertData.level_id = level_id;
    }
    if (order_in_level !== null && order_in_level !== undefined) {
      insertData.order_in_level = order_in_level;
    }

    // Create new lesson (use admin client for write operations to bypass RLS)
    const { data: lesson, error: insertError } = await supabaseAdmin
      .from('lessons')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lesson:', insertError);
      console.error('Insert data:', insertData);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create lesson',
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/lessons:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

