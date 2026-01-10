import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const lessonId = searchParams.get('lessonId');

    if (!text) {
      return NextResponse.json(
        { error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    // Try to find phrase in database by portuguese_text
    const query = supabase
      .from('phrases')
      .select('id, portuguese_text, audio_url, lesson_id')
      .eq('portuguese_text', text.trim())
      .limit(1);

    // If lessonId is provided, also filter by lesson_id
    if (lessonId) {
      query.eq('lesson_id', lessonId);
    }

    const { data: phrases, error } = await query;

    if (error) {
      console.error('Error fetching phrase:', error);
      return NextResponse.json(
        { error: 'Failed to fetch phrase' },
        { status: 500 }
      );
    }

    if (phrases && phrases.length > 0 && phrases[0].audio_url) {
      return NextResponse.json({
        success: true,
        exists: true,
        phrase: phrases[0],
        audioUrl: phrases[0].audio_url,
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      phrase: null,
      audioUrl: null,
    });
  } catch (error: any) {
    console.error('Error in GET /api/phrases:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

