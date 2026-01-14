import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { extractWordsFromLesson } from '@/lib/extract-words-from-lesson';

// POST - Sync vocabulary from all existing lessons
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();

    // Get all lessons
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, yaml_content')
      .order('day_number', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    // Extract all words from all lessons
    const allWords = new Set<string>();
    let processedLessons = 0;
    let totalWordsFound = 0;

    if (lessons && lessons.length > 0) {
      lessons.forEach((lesson: any) => {
        if (lesson.yaml_content) {
          const words = extractWordsFromLesson(lesson.yaml_content);
          words.forEach(word => {
            if (word && word.length > 0) {
              allWords.add(word);
              totalWordsFound++;
            }
          });
          processedLessons++;
        }
      });
    }

    // Update global vocabulary
    const { data: vocabData, error: vocabError } = await supabase
      .from('admin_methodologies')
      .select('content')
      .eq('type', 'vocabulary')
      .single();

    if (vocabError) {
      console.error('Error fetching vocabulary:', vocabError);
      return NextResponse.json(
        { error: 'Failed to fetch vocabulary' },
        { status: 500 }
      );
    }

    // Update vocabulary with all words
    const { error: updateError } = await supabase
      .from('admin_methodologies')
      .update({
        content: JSON.stringify({ used_words: Array.from(allWords).sort() }),
        updated_at: new Date().toISOString(),
      })
      .eq('type', 'vocabulary');

    if (updateError) {
      console.error('Error updating vocabulary:', updateError);
      return NextResponse.json(
        { error: 'Failed to update vocabulary' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Vocabulary synced successfully',
      stats: {
        processedLessons,
        totalWordsFound,
        uniqueWords: allWords.size,
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/admin/methodologies/sync-vocabulary:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}


