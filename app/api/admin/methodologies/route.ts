import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET - Get all methodologies
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('admin_methodologies')
      .select('*')
      .order('type');

    if (error) {
      console.error('Error fetching methodologies:', error);
      return NextResponse.json(
        { error: 'Failed to fetch methodologies' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      methodologies: data || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/methodologies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update a methodology
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, content } = body;

    if (!type || content === undefined) {
      return NextResponse.json(
        { error: 'type and content are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    
    // Update or insert
    const { data, error } = await supabase
      .from('admin_methodologies')
      .upsert({
        type,
        content: typeof content === 'string' ? content : JSON.stringify(content),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'type'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating methodology:', error);
      return NextResponse.json(
        { error: 'Failed to update methodology' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      methodology: data,
    });
  } catch (error) {
    console.error('Error in PUT /api/admin/methodologies:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

