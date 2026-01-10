import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user progress for all lessons
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select(`
        *,
        lesson:lessons!user_progress_lesson_id_fkey (
          id,
          day_number,
          yaml_content
        ),
        task_progress (
          task_id,
          status,
          completed_at,
          completion_data
        )
      `)
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to fetch progress', details: progressError.message },
        { status: 500 }
      );
    }

    console.log('User progress loaded:', {
      userId,
      progressCount: progress?.length || 0,
      progress: progress?.map((p: any) => ({
        lessonId: p.lesson_id,
        dayNumber: p.lesson?.day_number,
        status: p.status,
        taskProgressCount: p.task_progress?.length || 0,
      })),
    });

    // Get all lessons to calculate total and create complete progress map
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, day_number')
      .order('day_number', { ascending: true });

    const totalLessons = allLessons?.length || 0;

    // Create a map of progress by lesson_id for quick lookup
    const progressMap = new Map<string, any>();
    (progress || []).forEach((p: any) => {
      const lessonId = p.lesson?.id || p.lesson_id;
      if (lessonId) {
        progressMap.set(lessonId, p);
      } else {
        console.warn('Progress entry without lesson_id or lesson:', p);
      }
    });

    // Create progress for all lessons (including not started)
    const lessonsProgress: any[] = [];
    
    if (allLessons) {
      for (const lesson of allLessons) {
        const existingProgress = progressMap.get(lesson.id);
        
        if (existingProgress) {
          const taskProgress = existingProgress.task_progress || [];
          const completedTasks = taskProgress.filter((tp: any) => tp.status === 'completed').length;
          const totalTasks = 5; // Each lesson has 5 tasks

          lessonsProgress.push({
            day_number: lesson.day_number,
            lesson_id: lesson.id,
            status: existingProgress.status || 'not_started',
            started_at: existingProgress.started_at,
            completed_at: existingProgress.completed_at,
            completed_tasks: completedTasks,
            total_tasks: totalTasks,
            task_progress: taskProgress,
          });
        } else {
          // Lesson not started
          lessonsProgress.push({
            day_number: lesson.day_number,
            lesson_id: lesson.id,
            status: 'not_started',
            started_at: null,
            completed_at: null,
            completed_tasks: 0,
            total_tasks: 5,
            task_progress: [],
          });
        }
      }
    }

    // Calculate statistics
    const startedLessons = lessonsProgress.filter((lp: any) => 
      lp.status === 'in_progress' || lp.status === 'completed'
    ).length;
    
    const completedLessons = lessonsProgress.filter((lp: any) => 
      lp.status === 'completed'
    ).length;

    return NextResponse.json({
      success: true,
      stats: {
        totalLessons,
        startedLessons,
        completedLessons,
        lessons: lessonsProgress,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

