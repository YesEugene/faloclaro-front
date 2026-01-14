import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { transformLessonForFrontend } from '@/lib/lesson-transformer';
import { extractWordsFromLesson } from '@/lib/extract-words-from-lesson';

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
      title_en,
      title_pt,
      subtitle_ru,
      subtitle_en,
      subtitle_pt
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
    if (title_ru !== undefined) updateData.title_ru = title_ru && title_ru.trim() ? title_ru.trim() : null;
    if (title_en !== undefined) updateData.title_en = title_en && title_en.trim() ? title_en.trim() : null;
    if (title_pt !== undefined) {
      // title_pt is required (NOT NULL), so use title_en or title_ru as fallback if empty
      const titlePtValue = title_pt && title_pt.trim() 
        ? title_pt.trim() 
        : (title_en && title_en.trim() ? title_en.trim() : (title_ru && title_ru.trim() ? title_ru.trim() : ''));
      updateData.title_pt = titlePtValue || null;
    }
    if (subtitle_ru !== undefined) updateData.subtitle_ru = subtitle_ru && subtitle_ru.trim() ? subtitle_ru.trim() : null;
    if (subtitle_en !== undefined) updateData.subtitle_en = subtitle_en && subtitle_en.trim() ? subtitle_en.trim() : null;
    if (subtitle_pt !== undefined) updateData.subtitle_pt = subtitle_pt && subtitle_pt.trim() ? subtitle_pt.trim() : null;

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

    // Auto-extract words from Task 1 (vocabulary) and update global vocabulary
    if (updateData.yaml_content) {
      try {
        const words = extractWordsFromLesson(updateData.yaml_content);

        // Update global vocabulary if we found words
        if (words.length > 0) {
          const supabaseAdmin = getSupabaseAdmin();
          
          // Get current vocabulary
          const { data: vocabData, error: vocabError } = await supabaseAdmin
            .from('admin_methodologies')
            .select('content')
            .eq('type', 'vocabulary')
            .single();

          if (!vocabError && vocabData) {
            try {
              const vocabContent = typeof vocabData.content === 'string' 
                ? JSON.parse(vocabData.content) 
                : vocabData.content;
              
              const usedWords = new Set(vocabContent.used_words || []);
              
              // Add new words
              words.forEach(word => {
                if (word && word.length > 0) {
                  usedWords.add(word);
                }
              });

              // Update vocabulary
              await supabaseAdmin
                .from('admin_methodologies')
                .update({
                  content: JSON.stringify({ used_words: Array.from(usedWords).sort() }),
                  updated_at: new Date().toISOString(),
                })
                .eq('type', 'vocabulary');

              console.log(`✅ Updated global vocabulary with ${words.length} new words`);
            } catch (parseError) {
              console.error('Error parsing vocabulary:', parseError);
            }
          }
        }
      } catch (extractError) {
        // Don't fail the request if word extraction fails
        console.error('Error extracting words from lesson:', extractError);
      }
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
    const supabase = getSupabaseAdmin();

    console.log(`🗑️  Starting deletion of lesson ${id}...`);

    // 0. Extract words from lesson and remove them from global vocabulary
    try {
      const { data: lessonData, error: lessonFetchError } = await supabase
        .from('lessons')
        .select('yaml_content')
        .eq('id', id)
        .single();

      if (!lessonFetchError && lessonData && lessonData.yaml_content) {
        const words = extractWordsFromLesson(lessonData.yaml_content);
        
        if (words.length > 0) {
          // Get current vocabulary
          const { data: vocabData, error: vocabError } = await supabase
            .from('admin_methodologies')
            .select('content')
            .eq('type', 'vocabulary')
            .single();

          if (!vocabError && vocabData) {
            try {
              const vocabContent = typeof vocabData.content === 'string' 
                ? JSON.parse(vocabData.content) 
                : vocabData.content;
              
              const usedWords = new Set(vocabContent.used_words || []);
              
              // Remove words from this lesson
              words.forEach(word => {
                usedWords.delete(word);
              });

              // Update vocabulary
              await supabase
                .from('admin_methodologies')
                .update({
                  content: JSON.stringify({ used_words: Array.from(usedWords).sort() }),
                  updated_at: new Date().toISOString(),
                })
                .eq('type', 'vocabulary');

              console.log(`✅ Removed ${words.length} words from global vocabulary`);
            } catch (parseError) {
              console.error('Error parsing vocabulary during deletion:', parseError);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('⚠️  Warning removing words from vocabulary (continuing with deletion):', err.message);
    }

    // Delete related data before deleting the lesson
    // Note: user_progress and lesson_access_tokens have ON DELETE CASCADE in schema,
    // but we'll delete them explicitly to ensure clean deletion
    
    // 1. Delete user progress (cascades to task_progress automatically)
    try {
      const { data: userProgressIds, error: fetchError } = await supabase
        .from('user_progress')
        .select('id')
        .eq('lesson_id', id);
      
      if (!fetchError && userProgressIds && userProgressIds.length > 0) {
        const progressIds = userProgressIds.map(p => p.id);
        
        // Delete task_progress first (references user_progress)
        await supabase
          .from('task_progress')
          .delete()
          .in('user_progress_id', progressIds);
        
        // Then delete user_progress
        await supabase
          .from('user_progress')
          .delete()
          .eq('lesson_id', id);
        
        console.log(`✅ Deleted ${userProgressIds.length} user_progress records`);
      }
    } catch (err: any) {
      console.warn('⚠️  Warning deleting user_progress (may not exist or cascade will handle):', err.message);
    }

    // 2. Delete lesson access tokens
    try {
      const { error: tokensError } = await supabase
        .from('lesson_access_tokens')
        .delete()
        .eq('lesson_id', id);
      
      if (!tokensError) {
        console.log('✅ Deleted lesson_access_tokens records');
      }
    } catch (err: any) {
      console.warn('⚠️  Warning deleting lesson_access_tokens (may not exist or cascade will handle):', err.message);
    }

    // 3. Delete related audio files
    try {
      const { error: audioFilesError } = await supabase
        .from('audio_files')
        .delete()
        .eq('lesson_id', id);
      
      if (!audioFilesError) {
        console.log('✅ Deleted audio_files records');
      }
    } catch (err: any) {
      console.warn('⚠️  Warning deleting audio_files (may not exist):', err.message);
    }

    // 4. Finally, delete the lesson itself (this will cascade delete any remaining related data)
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting lesson:', error);
      return NextResponse.json(
        { error: 'Failed to delete lesson', details: error.message },
        { status: 500 }
      );
    }

    console.log('✅ Lesson deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error: any) {
    console.error('❌ Error in DELETE /api/admin/lessons/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

