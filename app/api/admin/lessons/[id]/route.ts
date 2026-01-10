import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { transformLessonForFrontend } from '@/lib/lesson-transformer';

// GET - Get a specific lesson (with optional transformation for frontend)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const forFrontend = searchParams.get('for_frontend') === 'true';

    const { data: lesson, error } = await supabase
      .from('lessons')
      .select('*, levels(id, level_number, name_ru, name_en)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching lesson:', error);
      return NextResponse.json(
        { error: 'Failed to fetch lesson' },
        { status: 500 }
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Transform for frontend if requested
    if (forFrontend) {
      const transformedLesson = transformLessonForFrontend(lesson);
      return NextResponse.json({
        success: true,
        lesson: transformedLesson,
      });
    }

    return NextResponse.json({
      success: true,
      lesson,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/lessons/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a lesson
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      yaml_content,
      level_id,
      order_in_level,
      is_published,
      title_ru,
      title_en
    } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (yaml_content !== undefined) {
      updateData.yaml_content = typeof yaml_content === 'string' 
        ? JSON.parse(yaml_content) 
        : yaml_content;
    }
    if (level_id !== undefined) updateData.level_id = level_id;
    if (order_in_level !== undefined) updateData.order_in_level = order_in_level;
    if (is_published !== undefined) updateData.is_published = is_published;
    if (title_ru !== undefined) updateData.title_ru = title_ru;
    if (title_en !== undefined) updateData.title_en = title_en;

    // Update lesson (use admin client for write operations)
    const { data, error } = await getSupabaseAdmin()
      .from('lessons')
      .update(updateData)
      .eq('id', id)
      .select('*, levels(id, level_number, name_ru, name_en)')
      .single();

    if (error) {
      console.error('Error updating lesson:', error);
      return NextResponse.json(
        { error: 'Failed to update lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lesson: data,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/lessons/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lesson
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related audio files first (use admin client)
    await getSupabaseAdmin()
      .from('audio_files')
      .delete()
      .eq('lesson_id', id);

    // Delete lesson (use admin client)
    const { error } = await getSupabaseAdmin()
      .from('lessons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting lesson:', error);
      return NextResponse.json(
        { error: 'Failed to delete lesson' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/lessons/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

