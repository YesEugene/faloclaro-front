import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('subscription_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all lessons (1-60)
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, day_number')
      .order('day_number', { ascending: true });

    if (lessonsError || !allLessons || allLessons.length === 0) {
      return NextResponse.json(
        { error: 'Lessons not found' },
        { status: 500 }
      );
    }

    // Get existing tokens for this user
    const { data: existingTokens, error: tokensError } = await supabase
      .from('lesson_access_tokens')
      .select('lesson_id')
      .eq('user_id', userId);

    if (tokensError) {
      console.error('Error fetching existing tokens:', tokensError);
      // Continue anyway
    }

    const existingLessonIds = new Set(
      (existingTokens || []).map((t: any) => t.lesson_id)
    );

    // Create tokens for lessons that don't have them
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 365); // 1 year

    const tokensToCreate = allLessons
      .filter(lesson => !existingLessonIds.has(lesson.id))
      .map(lesson => ({
        user_id: userId,
        lesson_id: lesson.id,
        token: crypto.randomBytes(32).toString('hex'),
        expires_at: expiresAt.toISOString(),
      }));

    if (tokensToCreate.length > 0) {
      const { error: createError } = await supabase
        .from('lesson_access_tokens')
        .insert(tokensToCreate);

      if (createError) {
        console.error('Error creating lesson tokens:', createError);
        return NextResponse.json(
          { error: 'Failed to create access tokens' },
          { status: 500 }
        );
      }
    }

    // Send email with link to first lesson (if user doesn't have it already)
    const { data: firstLessonToken } = await supabase
      .from('lesson_access_tokens')
      .select('token, lesson_id, lesson:lessons(id, day_number)')
      .eq('user_id', userId)
      .eq('lesson:lessons(day_number)', 1)
      .single();

    if (firstLessonToken && firstLessonToken.lesson) {
      const { sendLessonEmail } = await import('@/lib/send-lesson-email');
      try {
        await sendLessonEmail(
          userId,
          firstLessonToken.lesson.id,
          1,
          firstLessonToken.token
        );
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        // Don't fail if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Full access granted successfully',
      tokensCreated: tokensToCreate.length,
      totalLessons: allLessons.length,
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users/give-full-access:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

