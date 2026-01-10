import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Get all levels
export async function GET(request: NextRequest) {
  try {
    const { data: levels, error } = await supabase
      .from('levels')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching levels:', error);
      return NextResponse.json(
        { error: 'Failed to fetch levels' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      levels: levels || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/levels:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new level
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { level_number, name_ru, name_en, description_ru, description_en, order_index } = body;

    if (!level_number || !name_ru || !name_en) {
      return NextResponse.json(
        { error: 'level_number, name_ru, and name_en are required' },
        { status: 400 }
      );
    }

    // Check if level with this number already exists
    const { data: existingLevel, error: checkError } = await supabase
      .from('levels')
      .select('id')
      .eq('level_number', level_number)
      .limit(1)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows returned, which is fine
      console.error('Error checking existing levels:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing levels' },
        { status: 500 }
      );
    }

    if (existingLevel) {
      return NextResponse.json(
        { error: `Level with number ${level_number} already exists` },
        { status: 400 }
      );
    }

    // Create new level
    const { data: level, error: insertError } = await supabase
      .from('levels')
      .insert({
        level_number,
        name_ru,
        name_en,
        description_ru: description_ru || null,
        description_en: description_en || null,
        order_index: order_index || level_number, // Default to level_number if not provided
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating level:', insertError);
      return NextResponse.json(
        { error: 'Failed to create level' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      level,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/levels:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

