import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';
import { buildDefaultVarsForUser, sendTemplateEmail } from '@/lib/email-engine';

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

    // Check if user has tokens (if not, create them)
    const { data: existingTokens } = await supabase
      .from('lesson_access_tokens')
      .select('token, lesson_id, lesson:lessons(day_number)')
      .eq('user_id', userId)
      .order('lesson:lessons(day_number)', { ascending: true })
      .limit(1);

    let firstToken: string | null = null;

    if (existingTokens && existingTokens.length > 0) {
      // Use existing token
      firstToken = existingTokens[0].token;
    } else {
      // Create tokens for first 3 lessons
      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, day_number')
        .in('day_number', [1, 2, 3])
        .order('day_number', { ascending: true });

      if (lessons && lessons.length > 0) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 365);

        for (const lesson of lessons) {
          const token = crypto.randomBytes(32).toString('hex');
          
          const { error: tokenError } = await supabase
            .from('lesson_access_tokens')
            .insert({
              user_id: user.id,
              lesson_id: lesson.id,
              token,
              expires_at: expiresAt.toISOString(),
            });

          if (!tokenError && lesson.day_number === 1) {
            firstToken = token;
          }
        }
      }
    }

    // Send email with link
    if (firstToken) {
      try {
        const vars = await buildDefaultVarsForUser(user.id);
        await sendTemplateEmail({ userId: user.id, templateKey: 'core_welcome', vars, dayNumber: 1 });
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/users/invite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}




