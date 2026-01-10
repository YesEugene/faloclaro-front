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

