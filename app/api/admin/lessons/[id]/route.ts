import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { yaml_content } = await request.json();

    if (!yaml_content) {
      return NextResponse.json(
        { error: 'yaml_content is required' },
        { status: 400 }
      );
    }

    // Update lesson
    const { data, error } = await supabase
      .from('lessons')
      .update({
        yaml_content: typeof yaml_content === 'string' 
          ? JSON.parse(yaml_content) 
          : yaml_content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
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

