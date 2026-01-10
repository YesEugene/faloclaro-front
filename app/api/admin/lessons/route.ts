import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('day_number', { ascending: true });

    if (error) {
      console.error('Error fetching lessons:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
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
    const { day_number, title_ru, title_en, yaml_content } = body;

    if (!day_number) {
      return NextResponse.json(
        { error: 'day_number is required' },
        { status: 400 }
      );
    }

    // Check if lesson with this day_number already exists
    const { data: existingLessons, error: checkError } = await supabase
      .from('lessons')
      .select('id')
      .eq('day_number', day_number)
      .limit(1);

    if (checkError) {
      console.error('Error checking existing lessons:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing lessons' },
        { status: 500 }
      );
    }

    if (existingLessons && existingLessons.length > 0) {
      return NextResponse.json(
        { error: `Lesson with day_number ${day_number} already exists` },
        { status: 400 }
      );
    }

    // Create new lesson
    const { data: lesson, error: insertError } = await supabase
      .from('lessons')
      .insert({
        day_number,
        title_ru: title_ru || null,
        title_en: title_en || null,
        yaml_content: yaml_content || {},
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating lesson:', insertError);
      return NextResponse.json(
        { error: 'Failed to create lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/lessons:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

