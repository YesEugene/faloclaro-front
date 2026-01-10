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
    // NOTE: phrases table does not have lesson_id column, so we search only by portuguese_text
    const { data: phrases, error } = await supabase
      .from('phrases')
      .select('id, portuguese_text, audio_url')
      .eq('portuguese_text', text.trim())
      .order('created_at', { ascending: false }) // Get most recent if multiple exist
      .limit(1);

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

