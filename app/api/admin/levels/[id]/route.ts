import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get a specific level
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data: level, error } = await supabase
      .from('levels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching level:', error);
      return NextResponse.json(
        { error: 'Failed to fetch level' },
        { status: 500 }
      );
    }

    if (!level) {
      return NextResponse.json(
        { error: 'Level not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      level,
    });
  } catch (error) {
    console.error('Error in GET /api/admin/levels/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a level
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name_ru, name_en, description_ru, description_en, order_index } = body;

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (name_ru !== undefined) updateData.name_ru = name_ru;
    if (name_en !== undefined) updateData.name_en = name_en;
    if (description_ru !== undefined) updateData.description_ru = description_ru;
    if (description_en !== undefined) updateData.description_en = description_en;
    if (order_index !== undefined) updateData.order_index = order_index;

    const { data: level, error } = await supabase
      .from('levels')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating level:', error);
      return NextResponse.json(
        { error: 'Failed to update level' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      level,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/levels/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a level
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if there are lessons in this level
    const { data: lessons, error: checkError } = await supabase
      .from('lessons')
      .select('id')
      .eq('level_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking lessons:', checkError);
      return NextResponse.json(
        { error: 'Failed to check lessons' },
        { status: 500 }
      );
    }

    if (lessons && lessons.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete level: it contains lessons. Remove lessons first or set them to another level.' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('levels')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting level:', error);
      return NextResponse.json(
        { error: 'Failed to delete level' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Level deleted successfully',
    });
  } catch (error) {
    console.error('Error in DELETE /api/admin/levels/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

