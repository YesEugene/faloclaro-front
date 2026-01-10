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

    // Get all lessons first to calculate total
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, day_number, yaml_content')
      .order('day_number', { ascending: true });

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return NextResponse.json(
        { error: 'Failed to fetch lessons' },
        { status: 500 }
      );
    }

    const totalLessons = allLessons?.length || 0;

    // Get user progress for all lessons (without join to avoid issues)
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('*, task_progress (*)')
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
      allLessonsCount: totalLessons,
    });

    // Create a map of progress by lesson_id for quick lookup
    const progressMap = new Map<string, any>();
    (progress || []).forEach((p: any) => {
      const lessonId = p.lesson_id;
      if (lessonId) {
        progressMap.set(lessonId, p);
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
          // Get total tasks from yaml_content or default to 5
          const yamlContent = lesson.yaml_content || {};
          const tasksArray = Array.isArray(yamlContent.tasks) ? yamlContent.tasks : [];
          const totalTasks = tasksArray.length > 0 ? tasksArray.length : 5;

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
          const yamlContent = lesson.yaml_content || {};
          const tasksArray = Array.isArray(yamlContent.tasks) ? yamlContent.tasks : [];
          const totalTasks = tasksArray.length > 0 ? tasksArray.length : 5;
          
          lessonsProgress.push({
            day_number: lesson.day_number,
            lesson_id: lesson.id,
            status: 'not_started',
            started_at: null,
            completed_at: null,
            completed_tasks: 0,
            total_tasks: totalTasks,
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

