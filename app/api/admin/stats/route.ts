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
        lesson:lessons (
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
      .eq('user_id', userId)
      .order('lesson:lessons(day_number)', { ascending: true });

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }

    // Get all lessons to calculate total
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('id, day_number')
      .order('day_number', { ascending: true });

    const totalLessons = allLessons?.length || 0;

    // Process progress data
    const lessonsProgress = (progress || []).map((p: any) => {
      const lesson = p.lesson || {};
      const taskProgress = p.task_progress || [];
      const completedTasks = taskProgress.filter((tp: any) => tp.status === 'completed').length;
      const totalTasks = 5; // Each lesson has 5 tasks

      return {
        day_number: lesson.day_number || 0,
        lesson_id: lesson.id,
        status: p.status || 'not_started',
        started_at: p.started_at,
        completed_at: p.completed_at,
        completed_tasks: completedTasks,
        total_tasks: totalTasks,
        task_progress: taskProgress,
      };
    });

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

